import { HttpStatus, Injectable } from '@nestjs/common';
import { CampaignAudience, Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import {
  audienceProblem,
  CreateCampaignDto,
  MarkDeliveryDto,
  PreviewAudienceDto,
  UpdateCampaignDto,
} from './dto/campaign.schema';

// Vendas que contam como "comprou" para o público da campanha.
const BOUGHT: SaleStatus[] = ['confirmed', 'partially_returned'];
const DAY_MS = 24 * 60 * 60 * 1000;

type Audience = {
  audience: CampaignAudience;
  audienceBrandId?: string | null;
  audienceInactiveDays?: number | null;
};

export type Recipient = {
  id: string;
  name: string;
  whatsapp: string | null;
  birthDate: Date | null;
};

/** Mês atual (1–12) no fuso da loja. */
function currentMonthInSaoPaulo(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(now),
  );
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(companyId: string) {
    return this.prisma.campaign.findMany({
      where: { companyId, deletedAt: null },
      include: {
        audienceBrand: { select: { id: true, name: true } },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenant: CurrentTenantContext, dto: CreateCampaignDto) {
    await this.assertBrand(tenant.companyId, dto.audienceBrandId);
    return this.prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          companyId: tenant.companyId,
          title: dto.title,
          message: dto.message,
          imageUrl: dto.imageUrl ?? null,
          ...this.audienceData(dto),
          createdBy: tenant.userId,
        },
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'campaign.created',
        entityType: 'campaign',
        entityId: campaign.id,
        afterData: { title: campaign.title, audience: campaign.audience },
      });
      return campaign;
    });
  }

  async update(
    tenant: CurrentTenantContext,
    id: string,
    dto: UpdateCampaignDto,
  ) {
    const current = await this.findOwnedOrThrow(tenant.companyId, id);
    const merged: Audience = {
      audience: dto.audience ?? current.audience,
      audienceBrandId:
        dto.audienceBrandId !== undefined
          ? dto.audienceBrandId
          : current.audienceBrandId,
      audienceInactiveDays:
        dto.audienceInactiveDays !== undefined
          ? dto.audienceInactiveDays
          : current.audienceInactiveDays,
    };
    const problem = audienceProblem(merged);
    if (problem)
      throw new AppError(
        'VALIDATION_ERROR',
        problem.message,
        HttpStatus.BAD_REQUEST,
        problem.path,
      );
    await this.assertBrand(tenant.companyId, merged.audienceBrandId);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.message !== undefined ? { message: dto.message } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...this.audienceData(merged),
      },
    });
  }

  // Arquivar nunca apaga: os envios continuam no histórico (regra de
  // integridade nº 9).
  async archive(tenant: CurrentTenantContext, id: string) {
    await this.findOwnedOrThrow(tenant.companyId, id);
    return this.prisma.$transaction(async (tx) => {
      const archived = await tx.campaign.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'campaign.archived',
        entityType: 'campaign',
        entityId: id,
      });
      return archived;
    });
  }

  async preview(companyId: string, dto: PreviewAudienceDto) {
    await this.assertBrand(companyId, dto.audienceBrandId);
    const { recipients, withoutPhone } = await this.resolveAudience(
      companyId,
      dto,
    );
    return { count: recipients.length, withoutPhone };
  }

  // Campanha com a lista de quem vai receber e quem já recebeu (regra 11).
  async get(companyId: string, id: string) {
    const campaign = await this.findOwnedOrThrow(companyId, id, true);
    const [{ recipients, withoutPhone }, deliveries] = await Promise.all([
      this.resolveAudience(companyId, campaign),
      this.prisma.campaignDelivery.findMany({
        where: { companyId, campaignId: id },
        select: { customerId: true, sentAt: true },
      }),
    ]);
    const sentAt = new Map(
      deliveries.map((delivery) => [delivery.customerId, delivery.sentAt]),
    );
    return {
      ...campaign,
      withoutPhone,
      sentCount: deliveries.length,
      recipients: recipients.map((recipient) => ({
        id: recipient.id,
        name: recipient.name,
        whatsapp: recipient.whatsapp,
        sentAt: sentAt.get(recipient.id) ?? null,
      })),
    };
  }

  // Marca "enviado" para um cliente. Só para quem está no público agora e
  // aceitou receber (regra 9) — nunca confia na lista vinda da tela.
  async markDelivered(
    tenant: CurrentTenantContext,
    id: string,
    dto: MarkDeliveryDto,
  ) {
    const campaign = await this.findOwnedOrThrow(tenant.companyId, id);
    const { recipients } = await this.resolveAudience(
      tenant.companyId,
      campaign,
      dto.customerId,
    );
    if (recipients.length === 0)
      throw new AppError(
        'CUSTOMER_NOT_IN_AUDIENCE',
        'Este cliente não está no público da campanha ou não aceita receber ofertas.',
        HttpStatus.BAD_REQUEST,
        'customerId',
      );
    const existing = await this.prisma.campaignDelivery.findUnique({
      where: {
        campaignId_customerId: { campaignId: id, customerId: dto.customerId },
      },
    });
    if (existing) return existing;
    return this.prisma.campaignDelivery.create({
      data: {
        companyId: tenant.companyId,
        campaignId: id,
        customerId: dto.customerId,
        sentBy: tenant.userId,
      },
    });
  }

  /**
   * Público da campanha: clientes ativos com consentimento vigente (regra 9)
   * que atendem ao critério (regra 10). Quem não tem WhatsApp/telefone não
   * pode receber 1 a 1 e só é contado.
   */
  private async resolveAudience(
    companyId: string,
    audience: Audience,
    onlyCustomerId?: string,
  ) {
    const where: Prisma.CustomerWhereInput = {
      companyId,
      deletedAt: null,
      status: 'active',
      marketingConsentAt: { not: null },
      marketingOptOutAt: null,
      ...(onlyCustomerId ? { id: onlyCustomerId } : {}),
    };
    if (audience.audience === 'brand' && audience.audienceBrandId)
      where.sales = {
        some: {
          companyId,
          deletedAt: null,
          status: { in: BOUGHT },
          items: {
            some: {
              deletedAt: null,
              productVariant: {
                product: { brandId: audience.audienceBrandId },
              },
            },
          },
        },
      };
    if (audience.audience === 'inactive' && audience.audienceInactiveDays) {
      const since = new Date(
        Date.now() - audience.audienceInactiveDays * DAY_MS,
      );
      where.AND = [
        {
          sales: {
            some: { deletedAt: null, status: { in: BOUGHT } },
          },
        },
        {
          sales: {
            none: {
              deletedAt: null,
              status: { in: BOUGHT },
              createdAt: { gte: since },
            },
          },
        },
      ];
    }

    let customers = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        whatsapp: true,
        phone: true,
        birthDate: true,
      },
      orderBy: { name: 'asc' },
    });
    if (audience.audience === 'birthdays') {
      const month = currentMonthInSaoPaulo();
      // Data de nascimento é só data (meia-noite UTC): o mês é o UTC.
      customers = customers.filter(
        (customer) =>
          customer.birthDate && customer.birthDate.getUTCMonth() + 1 === month,
      );
    }

    const recipients: Recipient[] = [];
    let withoutPhone = 0;
    for (const customer of customers) {
      const whatsapp = (customer.whatsapp || customer.phone || '').trim();
      if (!whatsapp) {
        withoutPhone += 1;
        continue;
      }
      recipients.push({
        id: customer.id,
        name: customer.name,
        whatsapp,
        birthDate: customer.birthDate,
      });
    }
    return { recipients, withoutPhone };
  }

  private audienceData(audience: Audience) {
    return {
      audience: audience.audience,
      audienceBrandId:
        audience.audience === 'brand'
          ? (audience.audienceBrandId ?? null)
          : null,
      audienceInactiveDays:
        audience.audience === 'inactive'
          ? (audience.audienceInactiveDays ?? null)
          : null,
    };
  }

  private async assertBrand(companyId: string, brandId?: string | null) {
    if (!brandId) return;
    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, companyId },
      select: { id: true },
    });
    if (!brand)
      throw new AppError(
        'INVALID_BRAND',
        'Marca inválida.',
        HttpStatus.BAD_REQUEST,
        'audienceBrandId',
      );
  }

  private async findOwnedOrThrow(
    companyId: string,
    id: string,
    withBrand = false,
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId, deletedAt: null },
      include: withBrand
        ? { audienceBrand: { select: { id: true, name: true } } }
        : undefined,
    });
    if (!campaign)
      throw new AppError(
        'CAMPAIGN_NOT_FOUND',
        'Campanha não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    return campaign;
  }
}

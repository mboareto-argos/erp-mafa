import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CreateCustomerDto } from './dto/create-customer.schema';
import { UpdateCustomerDto } from './dto/update-customer.schema';
import { MarketingConsentDto } from './dto/marketing-consent.schema';
import { AuditService } from '../audit/audit.service';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export type ListCustomersParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // RN 10.9.3: e-mail/telefone duplicado gera alerta, nunca bloqueio —
  // decisão de UX de frontend, o backend nunca rejeita por duplicidade.
  create(tenant: CurrentTenantContext, dto: CreateCustomerDto) {
    const { marketingConsentSource, ...data } = dto;
    if (!marketingConsentSource)
      return this.prisma.customer.create({
        data: {
          companyId: tenant.companyId,
          createdBy: tenant.userId,
          ...data,
        },
      });
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          companyId: tenant.companyId,
          createdBy: tenant.userId,
          ...data,
          marketingConsentAt: new Date(),
          marketingConsentSource,
        },
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'customer.marketing_consent_granted',
        entityType: 'customer',
        entityId: customer.id,
        afterData: { source: marketingConsentSource },
      });
      return customer;
    });
  }

  // BR §10.9, regra 9: aceite com data e origem; deixar de receber grava a
  // data de saída. Cada mudança fica na auditoria (histórico do aceite).
  async setMarketingConsent(
    tenant: CurrentTenantContext,
    id: string,
    dto: MarketingConsentDto,
  ) {
    const customer = await this.findOwnedOrThrow(tenant.companyId, id);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data: dto.granted
          ? {
              marketingConsentAt: now,
              marketingConsentSource: dto.source,
              marketingOptOutAt: null,
            }
          : { marketingOptOutAt: now },
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: dto.granted
          ? 'customer.marketing_consent_granted'
          : 'customer.marketing_consent_revoked',
        entityType: 'customer',
        entityId: id,
        beforeData: {
          consentAt: customer.marketingConsentAt,
          source: customer.marketingConsentSource,
          optOutAt: customer.marketingOptOutAt,
        },
        afterData: {
          consentAt: updated.marketingConsentAt,
          source: updated.marketingConsentSource,
          optOutAt: updated.marketingOptOutAt,
        },
      });
      return updated;
    });
  }

  // Retrocompatível: sem `page`, devolve o array completo (usado pelo
  // seletor de cliente em Vendas — não pode quebrar).
  async list(companyId: string, params: ListCustomersParams = {}) {
    const where: Prisma.CustomerWhereInput = {
      companyId,
      deletedAt: null,
      ...(params.q
        ? { name: { contains: params.q, mode: 'insensitive' as const } }
        : {}),
    };

    if (!params.page) {
      return this.prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
    }

    const pageSize = Math.min(
      params.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const page = Math.max(params.page, 1);
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async update(companyId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOwnedOrThrow(companyId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async detail(companyId: string, id: string) {
    const customer = await this.findOwnedOrThrow(companyId, id);
    const validSaleStatuses = ['confirmed', 'partially_returned'] as const;
    const [salesSummary, purchasedVariants, receivables, recentSales] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: {
            companyId,
            customerId: id,
            deletedAt: null,
            status: { in: [...validSaleStatuses] },
          },
          _count: { _all: true },
          _sum: { total: true },
          _avg: { total: true },
          _max: { createdAt: true },
        }),
        this.prisma.saleItem.findMany({
          where: {
            companyId,
            deletedAt: null,
            sale: {
              customerId: id,
              deletedAt: null,
              status: { in: [...validSaleStatuses] },
            },
          },
          distinct: ['productVariantId'],
          select: { productVariantId: true },
        }),
        this.prisma.receivable.findMany({
          where: {
            companyId,
            customerId: id,
            deletedAt: null,
            status: { in: ['pending', 'partially_received'] },
          },
          select: { amountOriginal: true, amountReceived: true },
        }),
        this.prisma.sale.findMany({
          where: { companyId, customerId: id, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
            _count: { select: { items: true } },
          },
        }),
      ]);

    const outstandingBalance = receivables.reduce(
      (total, receivable) =>
        total.plus(receivable.amountOriginal.minus(receivable.amountReceived)),
      new Prisma.Decimal(0),
    );

    return {
      ...customer,
      summary: {
        salesCount: salesSummary._count._all,
        totalPurchased: (
          salesSummary._sum.total ?? new Prisma.Decimal(0)
        ).toString(),
        averageTicket: (
          salesSummary._avg.total ?? new Prisma.Decimal(0)
        ).toString(),
        lastPurchaseAt: salesSummary._max.createdAt,
        productsPurchased: purchasedVariants.length,
        outstandingBalance: outstandingBalance.toString(),
      },
      recentSales,
    };
  }

  // Nunca apaga — histórico de compras permanece após inativação (RN 10.9.4).
  async deactivate(companyId: string, id: string) {
    await this.findOwnedOrThrow(companyId, id);
    return this.prisma.customer.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  async reactivate(companyId: string, id: string) {
    await this.findOwnedOrThrow(companyId, id);
    return this.prisma.customer.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  private async findOwnedOrThrow(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });
    if (!customer) {
      throw new AppError(
        'CUSTOMER_NOT_FOUND',
        'Cliente não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
    return customer;
  }
}

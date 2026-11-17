import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreatePaymentMethodDto } from './dto/create-payment-method.schema';
import { normalizePixKey, SetPixKeyDto } from './dto/pix-key.schema';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenant: CurrentTenantContext, dto: CreatePaymentMethodDto) {
    if (dto.financialAccountId) {
      const account = await this.prisma.financialAccount.findFirst({
        where: { id: dto.financialAccountId, companyId: tenant.companyId },
      });
      if (!account) {
        throw new AppError(
          'INVALID_FINANCIAL_ACCOUNT',
          'Conta financeira inválida.',
          HttpStatus.BAD_REQUEST,
          'financialAccountId',
        );
      }
    }

    return this.prisma.paymentMethod.create({
      data: { companyId: tenant.companyId, createdBy: tenant.userId, ...dto },
    });
  }

  list(companyId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async deactivate(companyId: string, id: string) {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id, companyId },
    });
    if (!method) {
      throw new AppError(
        'PAYMENT_METHOD_NOT_FOUND',
        'Forma de pagamento não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.prisma.paymentMethod.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  // Chave Pix para o QR Code da venda (BR §10.12, regra 8). Só em forma de
  // pagamento do tipo Pix; cada alteração vai para a auditoria.
  async setPixKey(tenant: CurrentTenantContext, id: string, dto: SetPixKeyDto) {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id, companyId: tenant.companyId, deletedAt: null },
    });
    if (!method)
      throw new AppError(
        'PAYMENT_METHOD_NOT_FOUND',
        'Forma de pagamento não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    if (method.type !== 'pix')
      throw new AppError(
        'PIX_KEY_NOT_ALLOWED',
        'Só formas de pagamento Pix têm chave Pix.',
        HttpStatus.BAD_REQUEST,
        'type',
      );
    let data: {
      pixKey: string | null;
      pixMerchantName: string | null;
      pixMerchantCity: string | null;
    } = { pixKey: null, pixMerchantName: null, pixMerchantCity: null };
    if (dto.key !== null) {
      const key = normalizePixKey(dto.keyType, dto.key);
      if (!key)
        throw new AppError(
          'INVALID_PIX_KEY',
          'Chave Pix inválida para o tipo escolhido.',
          HttpStatus.BAD_REQUEST,
          'key',
        );
      data = {
        pixKey: key,
        pixMerchantName: dto.merchantName,
        pixMerchantCity: dto.merchantCity,
      };
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.paymentMethod.update({ where: { id }, data });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'payment_method.pix_key_updated',
        entityType: 'payment_method',
        entityId: id,
        beforeData: {
          pixKey: method.pixKey,
          pixMerchantName: method.pixMerchantName,
          pixMerchantCity: method.pixMerchantCity,
        },
        afterData: data,
      });
      return updated;
    });
  }
}

import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, PayableStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import {
  calculateNetCash,
  exceedsRemainingBalance,
} from '../../common/finance/installment-payment';
import { CashFlowService } from '../cash-flow/cash-flow.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CreatePayableDto } from './dto/create-payable.schema';
import { PayPayableDto } from './dto/pay-payable.schema';
import { CancelPayableDto } from './dto/cancel-payable.schema';
import { AuditService } from '../audit/audit.service';
import { buildInstallmentSchedule } from '../../common/finance/installment-schedule';

const INCLUDE_DETAILS = {
  supplier: true,
  payments: true,
} satisfies Prisma.PayableInclude;

@Injectable()
export class PayablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashFlow: CashFlowService,
    private readonly audit: AuditService,
  ) {}

  async create(tenant: CurrentTenantContext, dto: CreatePayableDto) {
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, companyId: tenant.companyId },
      });
      if (!supplier) {
        throw new AppError(
          'INVALID_SUPPLIER',
          'Fornecedor inválido.',
          HttpStatus.BAD_REQUEST,
          'supplierId',
        );
      }
    }

    return this.prisma.payable.create({
      data: {
        companyId: tenant.companyId,
        supplierId: dto.supplierId,
        description: dto.description,
        amountOriginal: dto.amountOriginal,
        dueDate: dto.dueDate,
        createdBy: tenant.userId,
      },
      include: INCLUDE_DETAILS,
    });
  }

  async createForPurchase(
    client: Prisma.TransactionClient,
    params: {
      companyId: string;
      userId: string;
      purchaseId: string;
      supplierId?: string | null;
      amount: Prisma.Decimal;
      count: number;
      firstDueDate: string;
    },
  ) {
    const schedule = buildInstallmentSchedule(
      params.amount,
      params.count,
      params.firstDueDate,
    );
    const rows: { id: string }[] = [];
    for (const installment of schedule) {
      rows.push(
        await client.payable.create({
          data: {
            companyId: params.companyId,
            supplierId: params.supplierId,
            purchaseId: params.purchaseId,
            description: `Compra #${params.purchaseId.slice(0, 8)} · parcela ${installment.number}/${params.count}`,
            amountOriginal: installment.amount,
            dueDate: installment.dueDate,
            installmentNumber: installment.number,
            installmentCount: params.count,
            createdBy: params.userId,
          },
        }),
      );
    }
    return rows;
  }

  async list(companyId: string) {
    const payables = await this.prisma.payable.findMany({
      where: { companyId, deletedAt: null },
      include: INCLUDE_DETAILS,
      orderBy: { dueDate: 'asc' },
    });
    return payables.map(withOverdueFlag);
  }

  async get(companyId: string, id: string) {
    const payable = await this.prisma.payable.findFirst({
      where: { id, companyId },
      include: INCLUDE_DETAILS,
    });
    if (!payable) {
      throw new AppError(
        'PAYABLE_NOT_FOUND',
        'Conta a pagar não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return withOverdueFlag(payable);
  }

  // RN 10.15.11: pagamentos parciais suportados; nunca supera o saldo em
  // aberto (mesma logica de Receivables.pay()).
  async pay(tenant: CurrentTenantContext, id: string, dto: PayPayableDto) {
    const payable = await this.assertPayable(tenant.companyId, id);

    const amount = new Prisma.Decimal(dto.amount);
    if (
      exceedsRemainingBalance(
        amount,
        payable.amountOriginal,
        payable.amountPaid,
      )
    ) {
      const remaining = new Prisma.Decimal(payable.amountOriginal).sub(
        payable.amountPaid,
      );
      throw new AppError(
        'PAYABLE_AMOUNT_EXCEEDS_BALANCE',
        'O valor pago não pode superar o saldo em aberto.',
        HttpStatus.BAD_REQUEST,
        'amount',
        { remaining: remaining.toString(), requested: amount.toString() },
      );
    }

    const netCash = calculateNetCash(amount, dto.interest, dto.discount);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payablePayment.create({
        data: {
          companyId: tenant.companyId,
          payableId: id,
          financialAccountId: dto.financialAccountId,
          amount,
          interest: dto.interest,
          discount: dto.discount,
          createdBy: tenant.userId,
        },
      });

      await this.cashFlow.recordTransaction(tx, {
        companyId: tenant.companyId,
        financialAccountId: dto.financialAccountId,
        type: 'out',
        amount: netCash.negated(),
        originType: 'payable_payment',
        originId: payment.id,
        createdBy: tenant.userId,
      });

      const newAmountPaid = new Prisma.Decimal(payable.amountPaid).add(amount);
      const status: PayableStatus = newAmountPaid.greaterThanOrEqualTo(
        payable.amountOriginal,
      )
        ? 'paid'
        : 'partially_paid';

      const updated = await tx.payable.update({
        where: { id },
        data: { amountPaid: newAmountPaid, status },
        include: INCLUDE_DETAILS,
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'payable.paid',
        entityType: 'payable',
        entityId: id,
        afterData: { amount: amount.toString(), status },
      });
      return updated;
    });
  }

  async cancel(
    tenant: CurrentTenantContext,
    id: string,
    dto: CancelPayableDto,
  ) {
    await this.assertPayable(tenant.companyId, id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payable.update({
        where: { id },
        data: { status: 'cancelled', cancelReason: dto.reason },
        include: INCLUDE_DETAILS,
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'payable.cancelled',
        entityType: 'payable',
        entityId: id,
        afterData: { status: 'cancelled' },
        reason: dto.reason,
      });
      return updated;
    });
  }

  private async assertPayable(companyId: string, id: string) {
    const payable = await this.prisma.payable.findFirst({
      where: { id, companyId },
    });
    if (!payable) {
      throw new AppError(
        'PAYABLE_NOT_FOUND',
        'Conta a pagar não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (payable.status !== 'pending' && payable.status !== 'partially_paid') {
      throw new AppError(
        'INVALID_PAYABLE_STATUS',
        `Esta ação não é permitida para uma conta a pagar no status "${payable.status}".`,
        HttpStatus.CONFLICT,
        'status',
        { currentStatus: payable.status },
      );
    }
    return payable;
  }
}

function withOverdueFlag<T extends { dueDate: Date; status: PayableStatus }>(
  payable: T,
) {
  const isOverdue =
    (payable.status === 'pending' || payable.status === 'partially_paid') &&
    payable.dueDate < new Date();
  return { ...payable, isOverdue };
}

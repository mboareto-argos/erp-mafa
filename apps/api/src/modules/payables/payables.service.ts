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

const INCLUDE_DETAILS = {
  supplier: true,
  payments: true,
} satisfies Prisma.PayableInclude;

@Injectable()
export class PayablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashFlow: CashFlowService,
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

      return tx.payable.update({
        where: { id },
        data: { amountPaid: newAmountPaid, status },
        include: INCLUDE_DETAILS,
      });
    });
  }

  async cancel(
    tenant: CurrentTenantContext,
    id: string,
    dto: CancelPayableDto,
  ) {
    await this.assertPayable(tenant.companyId, id);
    return this.prisma.payable.update({
      where: { id },
      data: { status: 'cancelled', cancelReason: dto.reason },
      include: INCLUDE_DETAILS,
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

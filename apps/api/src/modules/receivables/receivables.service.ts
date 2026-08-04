import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, ReceivableStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import {
  calculateNetCash,
  exceedsRemainingBalance,
} from '../../common/finance/installment-payment';
import { CashFlowService } from '../cash-flow/cash-flow.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CreateReceivableDto } from './dto/create-receivable.schema';
import { PayReceivableDto } from './dto/pay-receivable.schema';
import { CancelReceivableDto } from './dto/cancel-receivable.schema';

const INCLUDE_DETAILS = {
  customer: true,
  payments: true,
} satisfies Prisma.ReceivableInclude;

@Injectable()
export class ReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashFlow: CashFlowService,
  ) {}

  async create(tenant: CurrentTenantContext, dto: CreateReceivableDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId: tenant.companyId },
      });
      if (!customer) {
        throw new AppError(
          'INVALID_CUSTOMER',
          'Cliente inválido.',
          HttpStatus.BAD_REQUEST,
          'customerId',
        );
      }
    }
    if (dto.saleId) {
      const sale = await this.prisma.sale.findFirst({
        where: { id: dto.saleId, companyId: tenant.companyId },
      });
      if (!sale) {
        throw new AppError(
          'INVALID_SALE',
          'Venda inválida.',
          HttpStatus.BAD_REQUEST,
          'saleId',
        );
      }
    }

    return this.prisma.receivable.create({
      data: {
        companyId: tenant.companyId,
        customerId: dto.customerId,
        saleId: dto.saleId,
        description: dto.description,
        amountOriginal: dto.amountOriginal,
        dueDate: dto.dueDate,
        createdBy: tenant.userId,
      },
      include: INCLUDE_DETAILS,
    });
  }

  async list(companyId: string) {
    const receivables = await this.prisma.receivable.findMany({
      where: { companyId, deletedAt: null },
      include: INCLUDE_DETAILS,
      orderBy: { dueDate: 'asc' },
    });
    return receivables.map(withOverdueFlag);
  }

  async get(companyId: string, id: string) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id, companyId },
      include: INCLUDE_DETAILS,
    });
    if (!receivable) {
      throw new AppError(
        'RECEIVABLE_NOT_FOUND',
        'Conta a receber não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return withOverdueFlag(receivable);
  }

  // RN 10.14.1/10.14.2: recebimento reduz o saldo em aberto e nunca pode
  // superá-lo. RN 10.14.4: recebimento gera movimentação financeira.
  async pay(tenant: CurrentTenantContext, id: string, dto: PayReceivableDto) {
    const receivable = await this.assertPayable(tenant.companyId, id);

    const amount = new Prisma.Decimal(dto.amount);
    if (
      exceedsRemainingBalance(
        amount,
        receivable.amountOriginal,
        receivable.amountReceived,
      )
    ) {
      const remaining = new Prisma.Decimal(receivable.amountOriginal).sub(
        receivable.amountReceived,
      );
      throw new AppError(
        'RECEIVABLE_AMOUNT_EXCEEDS_BALANCE',
        'O valor recebido não pode superar o saldo em aberto.',
        HttpStatus.BAD_REQUEST,
        'amount',
        { remaining: remaining.toString(), requested: amount.toString() },
      );
    }

    const netCash = calculateNetCash(amount, dto.interest, dto.discount);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.receivablePayment.create({
        data: {
          companyId: tenant.companyId,
          receivableId: id,
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
        type: 'in',
        amount: netCash,
        originType: 'receivable_payment',
        originId: payment.id,
        createdBy: tenant.userId,
      });

      const newAmountReceived = new Prisma.Decimal(
        receivable.amountReceived,
      ).add(amount);
      const status: ReceivableStatus = newAmountReceived.greaterThanOrEqualTo(
        receivable.amountOriginal,
      )
        ? 'received'
        : 'partially_received';

      return tx.receivable.update({
        where: { id },
        data: { amountReceived: newAmountReceived, status },
        include: INCLUDE_DETAILS,
      });
    });
  }

  // RN 10.14.5: cancelamento exige motivo.
  async cancel(
    tenant: CurrentTenantContext,
    id: string,
    dto: CancelReceivableDto,
  ) {
    await this.assertPayable(tenant.companyId, id);
    return this.prisma.receivable.update({
      where: { id },
      data: { status: 'cancelled', cancelReason: dto.reason },
      include: INCLUDE_DETAILS,
    });
  }

  private async assertPayable(companyId: string, id: string) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id, companyId },
    });
    if (!receivable) {
      throw new AppError(
        'RECEIVABLE_NOT_FOUND',
        'Conta a receber não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (
      receivable.status !== 'pending' &&
      receivable.status !== 'partially_received'
    ) {
      throw new AppError(
        'INVALID_RECEIVABLE_STATUS',
        `Esta ação não é permitida para uma conta a receber no status "${receivable.status}".`,
        HttpStatus.CONFLICT,
        'status',
        { currentStatus: receivable.status },
      );
    }
    return receivable;
  }
}

// RN 10.14.3: conta vencida identificada automaticamente pela data — sem
// job agendado, computado na leitura.
function withOverdueFlag<T extends { dueDate: Date; status: ReceivableStatus }>(
  receivable: T,
) {
  const isOverdue =
    (receivable.status === 'pending' ||
      receivable.status === 'partially_received') &&
    receivable.dueDate < new Date();
  return { ...receivable, isOverdue };
}

import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { CashFlowService } from '../cash-flow/cash-flow.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CreateExpenseDto } from './dto/create-expense.schema';
import { buildInstallmentSchedule } from '../../common/finance/installment-schedule';

const INCLUDE_DETAILS = {
  financialAccount: true,
  payable: { include: { payments: true } },
  payables: { include: { payments: true }, orderBy: { installmentNumber: 'asc' as const } },
} satisfies Prisma.ExpenseInclude;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashFlow: CashFlowService,
  ) {}

  async create(tenant: CurrentTenantContext, dto: CreateExpenseDto) {
    if (dto.paidNow) {
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

      return this.prisma.$transaction(async (tx) => {
        const expense = await tx.expense.create({
          data: {
            companyId: tenant.companyId,
            description: dto.description,
            category: dto.category,
            amount: dto.amount,
            competenceDate: dto.competenceDate,
            dueDate: dto.dueDate,
            paidAt: new Date(),
            financialAccountId: dto.financialAccountId,
            status: 'paid',
            createdBy: tenant.userId,
          },
          include: INCLUDE_DETAILS,
        });

        await this.cashFlow.recordTransaction(tx, {
          companyId: tenant.companyId,
          financialAccountId: dto.financialAccountId!,
          type: 'out',
          amount: new Prisma.Decimal(dto.amount).negated(),
          originType: 'expense',
          originId: expense.id,
          description: dto.description,
          createdBy: tenant.userId,
        });

        return expense;
      });
    }

    // Despesa futura — gera automaticamente um Payable vinculado
    // (RN 10.15.3). Pagar depois é pagar esse Payable (sem endpoint de
    // pagamento duplicado aqui).
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          companyId: tenant.companyId,
          description: dto.description,
          category: dto.category,
          amount: dto.amount,
          competenceDate: dto.competenceDate,
          dueDate: dto.dueDate!,
          status: 'pending',
          createdBy: tenant.userId,
        },
      });
      const schedule = buildInstallmentSchedule(dto.amount, dto.installmentCount, dto.dueDate!);
      let firstPayableId: string | undefined;
      for (const installment of schedule) {
        const payable = await tx.payable.create({ data: { companyId: tenant.companyId, expenseId: expense.id, description: `${dto.description} · parcela ${installment.number}/${dto.installmentCount}`, amountOriginal: installment.amount, dueDate: installment.dueDate, installmentNumber: installment.number, installmentCount: dto.installmentCount, createdBy: tenant.userId } });
        firstPayableId ??= payable.id;
      }
      return tx.expense.update({ where: { id: expense.id }, data: { payableId: firstPayableId }, include: INCLUDE_DETAILS });
    });
  }

  list(companyId: string) {
    return this.prisma.expense.findMany({
      where: { companyId, deletedAt: null },
      include: INCLUDE_DETAILS,
      orderBy: { competenceDate: 'desc' },
    });
  }

  async get(companyId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId },
      include: INCLUDE_DETAILS,
    });
    if (!expense) {
      throw new AppError(
        'EXPENSE_NOT_FOUND',
        'Despesa não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return expense;
  }

  // RN 10.15.9: despesas canceladas não afetam relatórios realizados — só
  // permitido antes de paga (uma despesa já paga já moveu caixa de
  // verdade, estorno fica fora de escopo desta fase).
  async cancel(tenant: CurrentTenantContext, id: string) {
    const expense = await this.get(tenant.companyId, id);
    if (expense.status !== 'pending') {
      throw new AppError(
        'INVALID_EXPENSE_STATUS',
        `Esta ação não é permitida para uma despesa no status "${expense.status}".`,
        HttpStatus.CONFLICT,
        'status',
        { currentStatus: expense.status },
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (expense.payables.length) {
        await tx.payable.updateMany({
          where: { companyId: tenant.companyId, expenseId: expense.id, status: 'pending' },
          data: {
            status: 'cancelled',
            cancelReason: 'Despesa vinculada cancelada',
          },
        });
      }
      return tx.expense.update({
        where: { id },
        data: { status: 'cancelled' },
        include: INCLUDE_DETAILS,
      });
    });
  }
}

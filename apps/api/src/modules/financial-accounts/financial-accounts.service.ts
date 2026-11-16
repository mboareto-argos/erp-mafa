import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { CashFlowService } from '../cash-flow/cash-flow.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CreateFinancialAccountDto } from './dto/create-financial-account.schema';
import type {
  OpeningBalanceDto,
  OwnerContributionDto,
  ReconcileBalanceDto,
} from './dto/balance-operations.schema';

// Data civil (AAAA-MM-DD) vira meio-dia UTC: cai no mesmo dia em qualquer
// fuso do Brasil.
const civilToDate = (date?: string) =>
  date ? new Date(`${date}T12:00:00.000Z`) : undefined;

@Injectable()
export class FinancialAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashFlow: CashFlowService,
    private readonly audit: AuditService,
  ) {}

  async create(tenant: CurrentTenantContext, dto: CreateFinancialAccountDto) {
    if (dto.kind === 'owner') {
      const existing = await this.prisma.financialAccount.findFirst({
        where: { companyId: tenant.companyId, kind: 'owner', deletedAt: null },
        select: { id: true },
      });
      if (existing)
        throw new AppError(
          'OWNER_ACCOUNT_EXISTS',
          'A empresa já tem uma conta do proprietário.',
          HttpStatus.CONFLICT,
          'kind',
        );
    }
    return this.prisma.financialAccount.create({
      data: { companyId: tenant.companyId, createdBy: tenant.userId, ...dto },
    });
  }

  // Cada conta já vem com o saldo calculado (RN 10.13.3) e se o saldo
  // inicial foi informado (regra 8) — a tela principal precisa dos dois.
  async list(companyId: string) {
    const [accounts, sums, openings] = await Promise.all([
      this.prisma.financialAccount.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
      this.prisma.financialTransaction.groupBy({
        by: ['financialAccountId'],
        where: { companyId },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.findMany({
        where: { companyId, originType: 'opening_balance' },
        select: { financialAccountId: true },
      }),
    ]);
    const balanceOf = new Map(
      sums.map((row) => [
        row.financialAccountId,
        row._sum.amount ?? new Prisma.Decimal(0),
      ]),
    );
    const withOpening = new Set(openings.map((row) => row.financialAccountId));
    return accounts.map((account) => ({
      ...account,
      balance: (balanceOf.get(account.id) ?? new Prisma.Decimal(0)).toString(),
      hasOpeningBalance: withOpening.has(account.id),
    }));
  }

  // Nunca apaga — RN 10.13.5: contas inativas permanecem no histórico.
  async deactivate(companyId: string, id: string) {
    const account = await this.findOrThrow(companyId, id);
    return this.prisma.financialAccount.update({
      where: { id: account.id },
      data: { status: 'inactive' },
    });
  }

  // Saldo sempre calculado por agregação (RN 10.13.3), nunca materializado.
  async getBalance(companyId: string, id: string) {
    await this.findOrThrow(companyId, id);
    const balance = await this.cashFlow.getAccountBalance(companyId, id);
    return { financialAccountId: id, balance };
  }

  // BR §10.13 regra 8: uma única vez por conta; ajuste, não receita.
  async setOpeningBalance(
    tenant: CurrentTenantContext,
    id: string,
    dto: OpeningBalanceDto,
  ) {
    const account = await this.findActiveOrThrow(tenant.companyId, id);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.financialTransaction.findFirst({
        where: {
          companyId: tenant.companyId,
          financialAccountId: id,
          originType: 'opening_balance',
        },
        select: { id: true },
      });
      if (existing)
        throw new AppError(
          'OPENING_BALANCE_ALREADY_SET',
          'O saldo inicial desta conta já foi informado. Para corrigir, use "Conferir com o banco".',
          HttpStatus.CONFLICT,
        );
      const transaction = await this.cashFlow.recordTransaction(tx, {
        companyId: tenant.companyId,
        financialAccountId: id,
        type: 'adjustment',
        amount: new Prisma.Decimal(dto.amount),
        originType: 'opening_balance',
        originId: account.id,
        description: 'Saldo inicial',
        createdBy: tenant.userId,
        occurredAt: civilToDate(dto.date),
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'financial_account.opening_balance_set',
        entityType: 'financial_account',
        entityId: id,
        afterData: { amount: dto.amount, date: dto.date ?? null },
      });
      return transaction;
    });
  }

  // BR §10.13 regra 9: lança só a diferença. Repetir com o mesmo saldo não
  // gera nada (idempotente por natureza).
  async reconcile(
    tenant: CurrentTenantContext,
    id: string,
    dto: ReconcileBalanceDto,
  ) {
    await this.findActiveOrThrow(tenant.companyId, id);
    return this.prisma.$transaction(async (tx) => {
      const sum = await tx.financialTransaction.aggregate({
        where: { companyId: tenant.companyId, financialAccountId: id },
        _sum: { amount: true },
      });
      const calculated = sum._sum.amount ?? new Prisma.Decimal(0);
      const actual = new Prisma.Decimal(dto.actualBalance);
      const difference = actual.sub(calculated);
      if (difference.isZero())
        return { adjusted: false, difference: '0', balance: actual.toString() };
      await this.cashFlow.recordTransaction(tx, {
        companyId: tenant.companyId,
        financialAccountId: id,
        type: 'adjustment',
        amount: difference,
        originType: 'balance_adjustment',
        originId: randomUUID(),
        description: `Conferência de saldo: ${dto.reason}`,
        createdBy: tenant.userId,
        occurredAt: civilToDate(dto.date),
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'financial_account.balance_reconciled',
        entityType: 'financial_account',
        entityId: id,
        beforeData: { balance: calculated.toString() },
        afterData: {
          balance: actual.toString(),
          difference: difference.toString(),
        },
        reason: dto.reason,
      });
      return {
        adjusted: true,
        difference: difference.toString(),
        balance: actual.toString(),
      };
    });
  }

  // BR §10.13 regra 10: aporte reduz o que a loja deve ao proprietário e
  // nunca passa do valor devido.
  async ownerContribution(
    tenant: CurrentTenantContext,
    id: string,
    dto: OwnerContributionDto,
  ) {
    const account = await this.findActiveOrThrow(tenant.companyId, id);
    if (account.kind !== 'owner')
      throw new AppError(
        'NOT_OWNER_ACCOUNT',
        'Aporte só pode ser registrado na conta do proprietário.',
        HttpStatus.BAD_REQUEST,
      );
    return this.prisma.$transaction(async (tx) => {
      const sum = await tx.financialTransaction.aggregate({
        where: { companyId: tenant.companyId, financialAccountId: id },
        _sum: { amount: true },
      });
      const owed = (sum._sum.amount ?? new Prisma.Decimal(0)).neg();
      const amount = new Prisma.Decimal(dto.amount);
      if (amount.greaterThan(owed))
        throw new AppError(
          'CONTRIBUTION_EXCEEDS_DEBT',
          owed.greaterThan(0)
            ? `O aporte não pode passar do que a loja te deve (R$ ${owed.toFixed(2).replace('.', ',')}).`
            : 'A loja não deve nada ao proprietário agora.',
          HttpStatus.BAD_REQUEST,
          'amount',
        );
      const transaction = await this.cashFlow.recordTransaction(tx, {
        companyId: tenant.companyId,
        financialAccountId: id,
        type: 'adjustment',
        amount,
        originType: 'owner_contribution',
        originId: randomUUID(),
        description: dto.note
          ? `Aporte do proprietário: ${dto.note}`
          : 'Aporte do proprietário',
        createdBy: tenant.userId,
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'financial_account.owner_contribution',
        entityType: 'financial_account',
        entityId: id,
        beforeData: { owed: owed.toString() },
        afterData: {
          contribution: amount.toString(),
          owed: owed.sub(amount).toString(),
        },
        reason: dto.note,
      });
      return transaction;
    });
  }

  private async findActiveOrThrow(companyId: string, id: string) {
    const account = await this.findOrThrow(companyId, id);
    if (account.status !== 'active')
      throw new AppError(
        'FINANCIAL_ACCOUNT_INACTIVE',
        'Esta conta está inativa.',
        HttpStatus.CONFLICT,
      );
    return account;
  }

  private async findOrThrow(companyId: string, id: string) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id, companyId },
    });
    if (!account) {
      throw new AppError(
        'FINANCIAL_ACCOUNT_NOT_FOUND',
        'Conta financeira não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return account;
  }
}

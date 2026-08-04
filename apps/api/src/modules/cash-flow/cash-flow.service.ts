import { Injectable } from '@nestjs/common';
import {
  Prisma,
  FinancialTransactionOriginType,
  FinancialTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CashFlowService {
  constructor(private readonly prisma: PrismaService) {}

  // Unico lugar que cria FinancialTransaction — mesmo papel que
  // InventoryService.receiveGoods() tem pra estoque. Chamado dentro da
  // MESMA transacao do chamador (TA-ARCH-003); lancamento imutavel
  // (regra de integridade no 10 do Documento de Negocio).
  recordTransaction(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      financialAccountId: string;
      type: FinancialTransactionType;
      amount: Prisma.Decimal.Value;
      originType: FinancialTransactionOriginType;
      originId: string;
      description?: string;
      createdBy?: string;
    },
  ) {
    return tx.financialTransaction.create({
      data: {
        companyId: params.companyId,
        financialAccountId: params.financialAccountId,
        type: params.type,
        amount: params.amount,
        originType: params.originType,
        originId: params.originId,
        description: params.description,
        createdBy: params.createdBy,
      },
    });
  }

  getTransactions(
    companyId: string,
    filters: {
      financialAccountId?: string;
      type?: FinancialTransactionType;
      from?: Date;
      to?: Date;
    },
  ) {
    return this.prisma.financialTransaction.findMany({
      where: {
        companyId,
        ...(filters.financialAccountId
          ? { financialAccountId: filters.financialAccountId }
          : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.from || filters.to
          ? {
              occurredAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  // Saldo nunca e' materializado — sempre agregado das transacoes
  // (RN 10.13.3).
  async getAccountBalance(companyId: string, financialAccountId: string) {
    const result = await this.prisma.financialTransaction.aggregate({
      where: { companyId, financialAccountId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? new Prisma.Decimal(0);
  }
}

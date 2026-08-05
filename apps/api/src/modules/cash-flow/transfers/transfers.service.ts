import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { CashFlowService } from '../cash-flow.service';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreateTransferDto } from './dto/create-transfer.schema';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashFlow: CashFlowService,
    private readonly audit: AuditService,
  ) {}

  // RN 10.13.2/10.16.5: transferência entre contas próprias nunca é
  // receita/despesa — gera duas FinancialTransaction (saída + entrada) com
  // originType=transfer, nunca uma so'.
  async create(tenant: CurrentTenantContext, dto: CreateTransferDto) {
    const [fromAccount, toAccount] = await Promise.all([
      this.prisma.financialAccount.findFirst({
        where: { id: dto.fromAccountId, companyId: tenant.companyId },
      }),
      this.prisma.financialAccount.findFirst({
        where: { id: dto.toAccountId, companyId: tenant.companyId },
      }),
    ]);
    if (!fromAccount) {
      throw new AppError(
        'INVALID_FINANCIAL_ACCOUNT',
        'Conta de origem inválida.',
        HttpStatus.BAD_REQUEST,
        'fromAccountId',
      );
    }
    if (!toAccount) {
      throw new AppError(
        'INVALID_FINANCIAL_ACCOUNT',
        'Conta de destino inválida.',
        HttpStatus.BAD_REQUEST,
        'toAccountId',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.create({
        data: {
          companyId: tenant.companyId,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          amount: dto.amount,
          reason: dto.reason,
          createdBy: tenant.userId,
        },
      });

      await this.cashFlow.recordTransaction(tx, {
        companyId: tenant.companyId,
        financialAccountId: dto.fromAccountId,
        type: 'transfer',
        amount: new Prisma.Decimal(dto.amount).negated(),
        originType: 'transfer',
        originId: transfer.id,
        createdBy: tenant.userId,
      });
      await this.cashFlow.recordTransaction(tx, {
        companyId: tenant.companyId,
        financialAccountId: dto.toAccountId,
        type: 'transfer',
        amount: dto.amount,
        originType: 'transfer',
        originId: transfer.id,
        createdBy: tenant.userId,
      });

      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'transfer.created',
        entityType: 'transfer',
        entityId: transfer.id,
        afterData: {
          amount: transfer.amount.toString(),
          fromAccountId: transfer.fromAccountId,
          toAccountId: transfer.toAccountId,
        },
        reason: dto.reason,
      });
      return transfer;
    });
  }

  list(companyId: string) {
    return this.prisma.transfer.findMany({
      where: { companyId },
      include: { fromAccount: true, toAccount: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

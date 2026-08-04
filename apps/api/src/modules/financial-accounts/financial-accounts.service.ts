import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { CashFlowService } from '../cash-flow/cash-flow.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CreateFinancialAccountDto } from './dto/create-financial-account.schema';

@Injectable()
export class FinancialAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashFlow: CashFlowService,
  ) {}

  create(tenant: CurrentTenantContext, dto: CreateFinancialAccountDto) {
    return this.prisma.financialAccount.create({
      data: { companyId: tenant.companyId, createdBy: tenant.userId, ...dto },
    });
  }

  list(companyId: string) {
    return this.prisma.financialAccount.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
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

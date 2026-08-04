import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FinancialTransactionType } from '@prisma/client';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CashFlowService } from '../cash-flow.service';

@Controller('cash-flow/transactions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransactionsController {
  constructor(private readonly cashFlow: CashFlowService) {}

  @Get()
  @RequirePermission('view_cash_flow')
  list(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Query('financialAccountId') financialAccountId?: string,
    @Query('type') type?: FinancialTransactionType,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.cashFlow.getTransactions(tenant.companyId, {
      financialAccountId,
      type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}

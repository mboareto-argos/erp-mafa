import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../tenancy/permissions.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { FinancialAccountsService } from './financial-accounts.service';
import {
  openingBalanceSchema,
  ownerContributionSchema,
  reconcileBalanceSchema,
  type OpeningBalanceDto,
  type OwnerContributionDto,
  type ReconcileBalanceDto,
} from './dto/balance-operations.schema';
import {
  createFinancialAccountSchema,
  type CreateFinancialAccountDto,
} from './dto/create-financial-account.schema';

@Controller('financial-accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialAccountsController {
  constructor(
    private readonly financialAccounts: FinancialAccountsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  @RequirePermission('manage_financial_accounts')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createFinancialAccountSchema))
    dto: CreateFinancialAccountDto,
  ) {
    return this.financialAccounts.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_financial_accounts')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.financialAccounts.list(tenant.companyId);
  }

  @Patch(':id/deactivate')
  @RequirePermission('manage_financial_accounts')
  deactivate(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.financialAccounts.deactivate(tenant.companyId, id);
  }

  @Get(':id/balance')
  @RequirePermission('view_financial_accounts')
  getBalance(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.financialAccounts.getBalance(tenant.companyId, id);
  }

  // BR §10.13 regra 8.
  @Post(':id/opening-balance')
  @RequirePermission('manage_financial_accounts')
  setOpeningBalance(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(openingBalanceSchema)) dto: OpeningBalanceDto,
  ) {
    return this.financialAccounts.setOpeningBalance(tenant, id, dto);
  }

  // BR §10.13 regra 9.
  @Post(':id/reconcile')
  @RequirePermission('manage_financial_accounts')
  reconcile(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reconcileBalanceSchema))
    dto: ReconcileBalanceDto,
  ) {
    return this.financialAccounts.reconcile(tenant, id, dto);
  }

  // BR §10.13 regra 10 — único destes que não é idempotente por natureza.
  @Post(':id/owner-contribution')
  @RequirePermission('manage_financial_accounts')
  ownerContribution(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ownerContributionSchema))
    dto: OwnerContributionDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `financial-accounts.owner-contribution:${id}`,
      key,
      () => this.financialAccounts.ownerContribution(tenant, id, dto),
    );
  }
}

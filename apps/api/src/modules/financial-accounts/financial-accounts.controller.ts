import {
  Body,
  Controller,
  Get,
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
import { FinancialAccountsService } from './financial-accounts.service';
import {
  createFinancialAccountSchema,
  type CreateFinancialAccountDto,
} from './dto/create-financial-account.schema';

@Controller('financial-accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinancialAccountsController {
  constructor(private readonly financialAccounts: FinancialAccountsService) {}

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
}

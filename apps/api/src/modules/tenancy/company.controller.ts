import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentTenant } from './current-tenant.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { CurrentTenantContext } from './jwt-payload.interface';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermission } from './require-permission.decorator';
import { CompanyService } from './company.service';
import {
  updateCompanySchema,
  type UpdateCompanyDto,
} from './dto/update-company.schema';
import {
  profitDistributionSchema,
  type ProfitDistributionDto,
} from './dto/profit-distribution.schema';

@Controller('company')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyController {
  constructor(private readonly companies: CompanyService) {}

  @Get()
  @RequirePermission('view_company_settings')
  get(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.companies.get(tenant.companyId);
  }

  @Patch()
  @RequirePermission('manage_company_settings')
  update(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(updateCompanySchema)) dto: UpdateCompanyDto,
  ) {
    return this.companies.update(tenant, dto);
  }

  @Get('profit-distribution')
  @RequirePermission('view_company_settings')
  profitDistribution(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.companies.listProfitDistribution(tenant.companyId);
  }

  @Post('profit-distribution')
  @RequirePermission('manage_company_settings')
  saveProfitDistribution(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(profitDistributionSchema))
    dto: ProfitDistributionDto,
  ) {
    return this.companies.saveProfitDistribution(tenant, dto);
  }
}

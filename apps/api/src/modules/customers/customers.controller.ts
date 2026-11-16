import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../tenancy/permissions.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CustomersService } from './customers.service';
import {
  createCustomerSchema,
  type CreateCustomerDto,
} from './dto/create-customer.schema';
import {
  updateCustomerSchema,
  type UpdateCustomerDto,
} from './dto/update-customer.schema';
import {
  marketingConsentSchema,
  type MarketingConsentDto,
} from './dto/marketing-consent.schema';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  @RequirePermission('manage_customers')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createCustomerSchema)) dto: CreateCustomerDto,
  ) {
    return this.customers.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_customers')
  list(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.customers.list(tenant.companyId, {
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('view_customers')
  detail(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.customers.detail(tenant.companyId, id);
  }

  @Patch(':id')
  @RequirePermission('manage_customers')
  update(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) dto: UpdateCustomerDto,
  ) {
    return this.customers.update(tenant.companyId, id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermission('manage_customers')
  deactivate(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.customers.deactivate(tenant.companyId, id);
  }

  @Patch(':id/reactivate')
  @RequirePermission('manage_customers')
  reactivate(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.customers.reactivate(tenant.companyId, id);
  }

  // BR §10.9, regra 9 — aceite/saída de ofertas com data do servidor.
  @Put(':id/marketing-consent')
  @RequirePermission('manage_customers')
  setMarketingConsent(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marketingConsentSchema))
    dto: MarketingConsentDto,
  ) {
    return this.customers.setMarketingConsent(tenant, id, dto);
  }
}

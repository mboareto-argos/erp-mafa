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
import { CustomersService } from './customers.service';
import {
  createCustomerSchema,
  type CreateCustomerDto,
} from './dto/create-customer.schema';

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
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.customers.list(tenant.companyId);
  }

  @Patch(':id/deactivate')
  @RequirePermission('manage_customers')
  deactivate(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.customers.deactivate(tenant.companyId, id);
  }
}

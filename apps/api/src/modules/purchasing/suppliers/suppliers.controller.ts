import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { SuppliersService } from './suppliers.service';
import {
  createSupplierSchema,
  type CreateSupplierDto,
} from './dto/create-supplier.schema';

@Controller('purchasing/suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Post()
  @RequirePermission('manage_purchasing')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createSupplierSchema)) dto: CreateSupplierDto,
  ) {
    return this.suppliers.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_purchasing')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.suppliers.list(tenant.companyId);
  }

  @Patch(':id/deactivate')
  @RequirePermission('manage_purchasing')
  deactivate(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.suppliers.deactivate(tenant.companyId, id);
  }
}

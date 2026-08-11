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
import { BrandsService } from './brands.service';
import {
  createBrandSchema,
  type CreateBrandDto,
} from './dto/create-brand.schema';
import {
  updateBrandSchema,
  type UpdateBrandDto,
} from './dto/update-brand.schema';

@Controller('catalog/brands')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Post()
  @RequirePermission('manage_catalog')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createBrandSchema)) dto: CreateBrandDto,
  ) {
    return this.brands.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_catalog')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.brands.list(tenant.companyId);
  }

  @Patch(':id/deactivate')
  @RequirePermission('manage_catalog')
  deactivate(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.brands.changeStatus(tenant, id, 'inactive');
  }

  @Patch(':id/reactivate')
  @RequirePermission('manage_catalog')
  reactivate(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.brands.changeStatus(tenant, id, 'active');
  }

  @Patch(':id')
  @RequirePermission('manage_catalog')
  update(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBrandSchema)) dto: UpdateBrandDto,
  ) {
    return this.brands.update(tenant, id, dto);
  }
}

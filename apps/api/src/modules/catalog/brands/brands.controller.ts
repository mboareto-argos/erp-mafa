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
    return this.brands.deactivate(tenant.companyId, id);
  }
}

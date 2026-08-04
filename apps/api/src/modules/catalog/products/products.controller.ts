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
import { ProductsService } from './products.service';
import {
  createProductSchema,
  type CreateProductDto,
} from './dto/create-product.schema';

@Controller('catalog/products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @RequirePermission('manage_catalog')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductDto,
  ) {
    return this.products.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_catalog')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.products.list(tenant.companyId);
  }

  @Patch(':id/deactivate')
  @RequirePermission('manage_catalog')
  deactivate(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.products.deactivate(tenant.companyId, id);
  }
}

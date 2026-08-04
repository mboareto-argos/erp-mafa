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
import { CategoriesService } from './categories.service';
import {
  createCategorySchema,
  type CreateCategoryDto,
} from './dto/create-category.schema';

@Controller('catalog/categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @RequirePermission('manage_catalog')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createCategorySchema)) dto: CreateCategoryDto,
  ) {
    return this.categories.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_catalog')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.categories.list(tenant.companyId);
  }

  @Patch(':id/deactivate')
  @RequirePermission('manage_catalog')
  deactivate(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.categories.deactivate(tenant.companyId, id);
  }
}

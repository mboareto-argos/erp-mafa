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
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import {
  createInventoryCountSchema,
  type CreateInventoryCountDto,
} from './dto/create-inventory-count.schema';
import {
  updateInventoryCountSchema,
  type UpdateInventoryCountDto,
} from './dto/update-inventory-count.schema';
import { InventoryCountsService } from './inventory-counts.service';

@Controller('inventory/counts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryCountsController {
  constructor(private readonly counts: InventoryCountsService) {}
  @Get() @RequirePermission('view_inventory') list(
    @CurrentTenant() tenant: CurrentTenantContext,
  ) {
    return this.counts.list(tenant.companyId);
  }
  @Get(':id') @RequirePermission('view_inventory') get(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.counts.get(tenant.companyId, id);
  }
  @Post() @RequirePermission('adjust_stock') create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createInventoryCountSchema))
    dto: CreateInventoryCountDto,
  ) {
    return this.counts.create(tenant, dto);
  }
  @Patch(':id') @RequirePermission('adjust_stock') update(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInventoryCountSchema))
    dto: UpdateInventoryCountDto,
  ) {
    return this.counts.update(tenant, id, dto);
  }
  @Post(':id/complete') @RequirePermission('adjust_stock') complete(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.counts.complete(tenant, id);
  }
}

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { InventoryService } from '../inventory.service';
import {
  createAdjustmentSchema,
  type CreateAdjustmentDto,
} from './dto/create-adjustment.schema';

@Controller('inventory/adjustments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdjustmentsController {
  constructor(private readonly inventory: InventoryService) {}

  @Post()
  @RequirePermission('adjust_stock')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createAdjustmentSchema))
    dto: CreateAdjustmentDto,
  ) {
    return this.inventory.adjustStock(tenant, dto);
  }
}

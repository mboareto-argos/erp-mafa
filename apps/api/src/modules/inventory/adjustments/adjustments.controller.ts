import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
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
import { IdempotencyService } from '../../idempotency/idempotency.service';

@Controller('inventory/adjustments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdjustmentsController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  @RequirePermission('adjust_stock')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createAdjustmentSchema))
    dto: CreateAdjustmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `inventory.adjustments:${dto.productVariantId}:${dto.quantity}:${dto.reason}`,
      idempotencyKey,
      () => this.inventory.adjustStock(tenant, dto),
    );
  }
}

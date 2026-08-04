import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { InventoryService } from '../inventory.service';

@Controller('inventory/low-stock')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LowStockController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @RequirePermission('view_inventory')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.inventory.getLowStock(tenant.companyId);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { InventoryService } from '../inventory.service';

@Controller('inventory/movements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MovementsController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @RequirePermission('view_inventory')
  list(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Query('productVariantId') productVariantId?: string,
    // Opcionais, para a tela de Estoque não carregar o histórico inteiro:
    // `productVariantIds` (lista separada por vírgula, até 100) e `take`
    // (as N mais recentes, até 200). Sem eles, a resposta é a de sempre.
    @Query('productVariantIds') productVariantIds?: string,
    @Query('take') take?: string,
  ) {
    const ids = productVariantIds
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
      .slice(0, 100);
    const limit = take
      ? Math.min(Math.max(Math.trunc(Number(take)) || 1, 1), 200)
      : undefined;
    return this.inventory.getMovements(tenant.companyId, productVariantId, {
      productVariantIds: ids,
      take: limit,
    });
  }
}

import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryService } from './inventory.service';
import { BalancesController } from './balances/balances.controller';
import { MovementsController } from './movements/movements.controller';
import { AdjustmentsController } from './adjustments/adjustments.controller';
import { LowStockController } from './low-stock/low-stock.controller';

@Module({
  imports: [TenancyModule, CatalogModule],
  controllers: [
    BalancesController,
    MovementsController,
    AdjustmentsController,
    LowStockController,
  ],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

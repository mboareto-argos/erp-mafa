import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { PurchasesController } from './purchases/purchases.controller';
import { PurchasesService } from './purchases/purchases.service';

@Module({
  imports: [TenancyModule, InventoryModule],
  controllers: [SuppliersController, PurchasesController],
  providers: [SuppliersService, PurchasesService],
  exports: [SuppliersService],
})
export class PurchasingModule {}

import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CashFlowModule } from '../cash-flow/cash-flow.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [TenancyModule, InventoryModule, CashFlowModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}

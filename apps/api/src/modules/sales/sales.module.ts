import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CashFlowModule } from '../cash-flow/cash-flow.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { ReceivablesModule } from '../receivables/receivables.module';
import { ReceiptsService } from './receipts/receipts.service';
import { PublicReceiptsController } from './receipts/public-receipts.controller';

@Module({
  imports: [TenancyModule, InventoryModule, CashFlowModule, ReceivablesModule],
  controllers: [SalesController, PublicReceiptsController],
  providers: [SalesService, ReceiptsService],
})
export class SalesModule {}

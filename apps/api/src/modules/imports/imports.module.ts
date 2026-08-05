import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { PurchasingModule } from '../purchasing/purchasing.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { PayablesModule } from '../payables/payables.module';
import { ReceivablesModule } from '../receivables/receivables.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [
    TenancyModule,
    CatalogModule,
    InventoryModule,
    CustomersModule,
    PurchasingModule,
    ExpensesModule,
    PayablesModule,
    ReceivablesModule,
  ],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { IdentityModule } from './modules/identity/identity.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SalesModule } from './modules/sales/sales.module';
import { CashFlowModule } from './modules/cash-flow/cash-flow.module';
import { FinancialAccountsModule } from './modules/financial-accounts/financial-accounts.module';
import { ReceivablesModule } from './modules/receivables/receivables.module';
import { PayablesModule } from './modules/payables/payables.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { ImportsModule } from './modules/imports/imports.module';
import { AuditModule } from './modules/audit/audit.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    IdempotencyModule,
    IdentityModule,
    TenancyModule,
    CatalogModule,
    InventoryModule,
    PurchasingModule,
    CustomersModule,
    PaymentsModule,
    SalesModule,
    CashFlowModule,
    FinancialAccountsModule,
    ReceivablesModule,
    PayablesModule,
    ExpensesModule,
    ReportingModule,
    ImportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

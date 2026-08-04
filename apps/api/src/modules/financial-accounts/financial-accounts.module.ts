import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CashFlowModule } from '../cash-flow/cash-flow.module';
import { FinancialAccountsController } from './financial-accounts.controller';
import { FinancialAccountsService } from './financial-accounts.service';

@Module({
  imports: [TenancyModule, CashFlowModule],
  controllers: [FinancialAccountsController],
  providers: [FinancialAccountsService],
})
export class FinancialAccountsModule {}

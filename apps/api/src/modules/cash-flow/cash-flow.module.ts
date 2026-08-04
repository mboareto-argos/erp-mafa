import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CashFlowService } from './cash-flow.service';
import { TransactionsController } from './transactions/transactions.controller';
import { TransfersController } from './transfers/transfers.controller';
import { TransfersService } from './transfers/transfers.service';

@Module({
  imports: [TenancyModule],
  controllers: [TransactionsController, TransfersController],
  providers: [CashFlowService, TransfersService],
  exports: [CashFlowService],
})
export class CashFlowModule {}

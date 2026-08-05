import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CashFlowModule } from '../cash-flow/cash-flow.module';
import { ReceivablesController } from './receivables.controller';
import { ReceivablesService } from './receivables.service';

@Module({
  imports: [TenancyModule, CashFlowModule],
  controllers: [ReceivablesController],
  providers: [ReceivablesService],
  exports: [ReceivablesService],
})
export class ReceivablesModule {}

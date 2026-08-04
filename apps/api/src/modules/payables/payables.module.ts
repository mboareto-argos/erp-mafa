import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CashFlowModule } from '../cash-flow/cash-flow.module';
import { PayablesController } from './payables.controller';
import { PayablesService } from './payables.service';

@Module({
  imports: [TenancyModule, CashFlowModule],
  controllers: [PayablesController],
  providers: [PayablesService],
})
export class PayablesModule {}

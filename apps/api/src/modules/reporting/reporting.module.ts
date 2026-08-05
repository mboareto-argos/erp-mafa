import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

@Module({
  imports: [TenancyModule, InventoryModule],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}

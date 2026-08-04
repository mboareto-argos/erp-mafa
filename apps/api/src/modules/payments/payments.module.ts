import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { PaymentMethodsController } from './payment-methods/payment-methods.controller';
import { PaymentMethodsService } from './payment-methods/payment-methods.service';

@Module({
  imports: [TenancyModule],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService],
  exports: [PaymentMethodsService],
})
export class PaymentsModule {}

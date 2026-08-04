import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { PaymentMethodsService } from './payment-methods.service';
import {
  createPaymentMethodSchema,
  type CreatePaymentMethodDto,
} from './dto/create-payment-method.schema';

@Controller('payments/methods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethods: PaymentMethodsService) {}

  @Post()
  @RequirePermission('manage_payment_methods')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createPaymentMethodSchema))
    dto: CreatePaymentMethodDto,
  ) {
    return this.paymentMethods.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_payment_methods')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.paymentMethods.list(tenant.companyId);
  }

  @Patch(':id/deactivate')
  @RequirePermission('manage_payment_methods')
  deactivate(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.paymentMethods.deactivate(tenant.companyId, id);
  }
}

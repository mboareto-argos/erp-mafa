import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../tenancy/permissions.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { PayablesService } from './payables.service';
import {
  createPayableSchema,
  type CreatePayableDto,
} from './dto/create-payable.schema';
import { payPayableSchema, type PayPayableDto } from './dto/pay-payable.schema';
import {
  cancelPayableSchema,
  type CancelPayableDto,
} from './dto/cancel-payable.schema';
import { IdempotencyService } from '../idempotency/idempotency.service';

@Controller('payables')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayablesController {
  constructor(
    private readonly payables: PayablesService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  @RequirePermission('manage_payables')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createPayableSchema)) dto: CreatePayableDto,
  ) {
    return this.payables.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_payables')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.payables.list(tenant.companyId);
  }

  @Get(':id')
  @RequirePermission('view_payables')
  get(@CurrentTenant() tenant: CurrentTenantContext, @Param('id') id: string) {
    return this.payables.get(tenant.companyId, id);
  }

  @Post(':id/pay')
  @RequirePermission('manage_payables')
  pay(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(payPayableSchema)) dto: PayPayableDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `payables.pay:${id}`,
      key,
      () => this.payables.pay(tenant, id, dto),
    );
  }

  @Post(':id/cancel')
  @RequirePermission('manage_payables')
  cancel(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelPayableSchema)) dto: CancelPayableDto,
  ) {
    return this.payables.cancel(tenant, id, dto);
  }
}

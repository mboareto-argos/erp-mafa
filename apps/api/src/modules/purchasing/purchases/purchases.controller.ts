import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { PurchasesService } from './purchases.service';
import {
  createPurchaseSchema,
  type CreatePurchaseDto,
} from './dto/create-purchase.schema';
import {
  receivePurchaseSchema,
  type ReceivePurchaseDto,
} from './dto/receive-purchase.schema';
import { IdempotencyService } from '../../idempotency/idempotency.service';

@Controller('purchasing/purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(
    private readonly purchases: PurchasesService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  @RequirePermission('manage_purchasing')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createPurchaseSchema)) dto: CreatePurchaseDto,
  ) {
    return this.purchases.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_purchasing')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.purchases.list(tenant.companyId);
  }

  @Get(':id')
  @RequirePermission('view_purchasing')
  get(@CurrentTenant() tenant: CurrentTenantContext, @Param('id') id: string) {
    return this.purchases.get(tenant.companyId, id);
  }

  @Post(':id/order')
  @RequirePermission('manage_purchasing')
  order(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.purchases.order(tenant.companyId, id);
  }

  @Post(':id/receive')
  @RequirePermission('manage_purchasing')
  receive(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(receivePurchaseSchema)) dto: ReceivePurchaseDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `purchases.receive:${id}`,
      idempotencyKey,
      () => this.purchases.receive(tenant, id, dto),
    );
  }

  @Post(':id/cancel')
  @RequirePermission('manage_purchasing')
  cancel(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.purchases.cancel(tenant.companyId, id);
  }
}

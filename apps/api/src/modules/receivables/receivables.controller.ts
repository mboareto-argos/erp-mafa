import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../tenancy/permissions.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { ReceivablesService } from './receivables.service';
import {
  createReceivableSchema,
  type CreateReceivableDto,
} from './dto/create-receivable.schema';
import {
  payReceivableSchema,
  type PayReceivableDto,
} from './dto/pay-receivable.schema';
import {
  cancelReceivableSchema,
  type CancelReceivableDto,
} from './dto/cancel-receivable.schema';

@Controller('receivables')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReceivablesController {
  constructor(private readonly receivables: ReceivablesService) {}

  @Post()
  @RequirePermission('manage_receivables')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createReceivableSchema))
    dto: CreateReceivableDto,
  ) {
    return this.receivables.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_receivables')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.receivables.list(tenant.companyId);
  }

  @Get(':id')
  @RequirePermission('view_receivables')
  get(@CurrentTenant() tenant: CurrentTenantContext, @Param('id') id: string) {
    return this.receivables.get(tenant.companyId, id);
  }

  @Post(':id/pay')
  @RequirePermission('manage_receivables')
  pay(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(payReceivableSchema)) dto: PayReceivableDto,
  ) {
    return this.receivables.pay(tenant, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermission('manage_receivables')
  cancel(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelReceivableSchema))
    dto: CancelReceivableDto,
  ) {
    return this.receivables.cancel(tenant, id, dto);
  }
}

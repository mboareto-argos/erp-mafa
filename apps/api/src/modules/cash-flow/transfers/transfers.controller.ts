import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { TransfersService } from './transfers.service';
import {
  createTransferSchema,
  type CreateTransferDto,
} from './dto/create-transfer.schema';
import { IdempotencyService } from '../../idempotency/idempotency.service';

@Controller('cash-flow/transfers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransfersController {
  constructor(
    private readonly transfers: TransfersService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  @RequirePermission('manage_financial_accounts')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createTransferSchema)) dto: CreateTransferDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `transfers.create:${dto.fromAccountId}:${dto.toAccountId}`,
      key,
      () => this.transfers.create(tenant, dto),
    );
  }

  @Get()
  @RequirePermission('view_cash_flow')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.transfers.list(tenant.companyId);
  }
}

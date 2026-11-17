import { parsePage } from '../../common/pagination/pagination';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../tenancy/permissions.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { SalesService } from './sales.service';
import { createSaleSchema, type CreateSaleDto } from './dto/create-sale.schema';
import {
  confirmSaleSchema,
  receiptLinkSchema,
  type ConfirmSaleDto,
  type ReceiptLinkDto,
} from './dto/confirm-sale.schema';
import { ReceiptsService } from './receipts/receipts.service';
import { returnSaleSchema, type ReturnSaleDto } from './dto/return-sale.schema';
import { IdempotencyService } from '../idempotency/idempotency.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(
    private readonly sales: SalesService,
    private readonly idempotency: IdempotencyService,
    private readonly receipts: ReceiptsService,
  ) {}

  @Post()
  @RequirePermission('manage_sales')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createSaleSchema)) dto: CreateSaleDto,
  ) {
    return this.sales.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_sales')
  list(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sales.list(tenant.companyId, parsePage(page, pageSize));
  }

  @Patch(':id')
  @RequirePermission('manage_sales')
  updateDraft(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createSaleSchema)) dto: CreateSaleDto,
  ) {
    return this.sales.updateDraft(tenant, id, dto);
  }

  @Get(':id')
  @RequirePermission('view_sales')
  get(@CurrentTenant() tenant: CurrentTenantContext, @Param('id') id: string) {
    return this.sales.get(tenant.companyId, id);
  }

  @Post(':id/reserve')
  @RequirePermission('manage_sales')
  reserve(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `sales.reserve:${id}`,
      idempotencyKey,
      () => this.sales.reserve(tenant, id),
    );
  }

  // Link do recibo (BR §10.10, regra 26): devolve o ativo (cria se faltar);
  // { rotate: true } invalida o atual e gera outro.
  @Post(':id/receipt-link')
  @RequirePermission('manage_sales')
  receiptLink(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(receiptLinkSchema)) dto: ReceiptLinkDto,
  ) {
    return this.receipts.ensureLink(tenant, id, dto.rotate);
  }

  @Post(':id/confirm')
  @RequirePermission('manage_sales')
  confirm(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(confirmSaleSchema)) dto: ConfirmSaleDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `sales.confirm:${id}`,
      idempotencyKey,
      () => this.sales.confirm(tenant, id, dto),
    );
  }

  @Post(':id/cancel')
  @RequirePermission('manage_sales')
  cancel(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `sales.cancel:${id}`,
      idempotencyKey,
      () => this.sales.cancel(tenant, id),
    );
  }

  @Post(':id/return')
  @RequirePermission('manage_sales')
  returnItems(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(returnSaleSchema)) dto: ReturnSaleDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `sales.return:${id}`,
      idempotencyKey,
      () => this.sales.returnItems(tenant, id, dto),
    );
  }
}

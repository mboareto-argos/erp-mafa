import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { IdempotencyService } from '../../idempotency/idempotency.service';
import { KitsService } from './kits.service';
import {
  kitAssemblySchema,
  setKitSchema,
  type KitAssemblyDto,
  type SetKitDto,
} from './dto/kit.schema';

// Kits (BR §10.3, regras 11 a 13). Composição é cadastro (manage_catalog);
// montar/desmontar mexe em estoque (adjust_stock).
@Controller('kits')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class KitsController {
  constructor(
    private readonly kits: KitsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Get(':productId')
  @RequirePermission('view_catalog')
  get(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.kits.get(tenant.companyId, productId);
  }

  @Put(':productId')
  @RequirePermission('manage_catalog')
  set(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body(new ZodValidationPipe(setKitSchema)) dto: SetKitDto,
  ) {
    return this.kits.set(tenant, productId, dto);
  }

  @Post(':productId/assemble')
  @RequirePermission('adjust_stock')
  assemble(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body(new ZodValidationPipe(kitAssemblySchema)) dto: KitAssemblyDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `kits.assemble:${productId}:${dto.quantity}`,
      idempotencyKey,
      () => this.kits.assemble(tenant, productId, dto),
    );
  }

  @Post(':productId/disassemble')
  @RequirePermission('adjust_stock')
  disassemble(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body(new ZodValidationPipe(kitAssemblySchema)) dto: KitAssemblyDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `kits.disassemble:${productId}:${dto.quantity}`,
      idempotencyKey,
      () => this.kits.disassemble(tenant, productId, dto),
    );
  }
}

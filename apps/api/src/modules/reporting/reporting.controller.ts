import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { SaleStatus, SalesChannel } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { JwtAuthGuard } from '../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../tenancy/permissions.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { ReportingService } from './reporting.service';

// RN 10.17/10.18: todo indicador/relatório tem um período claramente
// definido — from/to são sempre obrigatórios (exceto valor de estoque, que
// é uma foto do momento atual, sem período).
function parsePeriod(from?: string, to?: string): { from: Date; to: Date } {
  if (!from || !to) {
    throw new AppError(
      'MISSING_PERIOD',
      'Informe o período (from e to).',
      HttpStatus.BAD_REQUEST,
      'from',
    );
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime()) ||
    fromDate > toDate
  ) {
    throw new AppError(
      'INVALID_PERIOD',
      'Período inválido.',
      HttpStatus.BAD_REQUEST,
      'from',
    );
  }
  return { from: fromDate, to: toDate };
}

@Controller('reporting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Get('dashboard')
  @RequirePermission('view_reports')
  dashboard(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const period = parsePeriod(from, to);
    return this.reporting.getDashboard(tenant, period.from, period.to);
  }

  @Get('sales')
  @RequirePermission('view_reports')
  sales(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('channel') channel?: SalesChannel,
    @Query('status') status?: SaleStatus,
  ) {
    const period = parsePeriod(from, to);
    return this.reporting.getSalesReport(
      tenant.companyId,
      period.from,
      period.to,
      channel,
      status,
    );
  }

  @Get('top-products')
  @RequirePermission('view_reports')
  topProducts(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('orderBy') orderBy?: 'quantity' | 'profit',
  ) {
    const period = parsePeriod(from, to);
    return this.reporting.getTopProducts(
      tenant.companyId,
      period.from,
      period.to,
      limit ? Number(limit) : 10,
      orderBy === 'profit' ? 'profit' : 'quantity',
    );
  }

  @Get('inventory-value')
  @RequirePermission('view_reports')
  inventoryValue(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.reporting.getInventoryValueReport(tenant.companyId);
  }

  @Get('dre')
  @RequirePermission('view_reports')
  dre(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const period = parsePeriod(from, to);
    return this.reporting.getDre(tenant.companyId, period.from, period.to);
  }
}

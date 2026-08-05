import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';
import { JwtAuthGuard } from '../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../tenancy/permissions.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { AuditService } from './audit.service';

function parseDate(label: string, value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(
      'INVALID_PERIOD',
      'Período inválido.',
      HttpStatus.BAD_REQUEST,
      label,
    );
  }
  return parsed;
}

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermission('view_audit')
  list(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.list(tenant.companyId, {
      entityType,
      entityId,
      action,
      from: parseDate('from', from),
      to: parseDate('to', to),
      limit: limit ? Number(limit) : undefined,
    });
  }
}

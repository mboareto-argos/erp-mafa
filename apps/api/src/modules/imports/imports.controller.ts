import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../tenancy/permissions.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { ImportsService } from './imports.service';
import { parseImportEntityType } from './entity-type.util';
import {
  confirmImportSchema,
  type ConfirmImportDto,
} from './dto/confirm-import.schema';

@Controller('imports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get(':entityType/template')
  @RequirePermission('manage_imports')
  template(@Param('entityType') entityType: string, @Res() res: Response) {
    const type = parseImportEntityType(entityType);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}.csv"`);
    res.send(this.imports.template(type));
  }

  @Post(':entityType/preview')
  @RequirePermission('manage_imports')
  @UseInterceptors(FileInterceptor('file'))
  preview(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('entityType') entityType: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const type = parseImportEntityType(entityType);
    const csv = file?.buffer.toString('utf-8') ?? '';
    return this.imports.preview(tenant, type, csv);
  }

  @Post(':entityType/confirm')
  @RequirePermission('manage_imports')
  confirm(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('entityType') entityType: string,
    @Body(new ZodValidationPipe(confirmImportSchema)) dto: ConfirmImportDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const type = parseImportEntityType(entityType);
    return this.imports.confirm(tenant, type, dto, idempotencyKey);
  }

  @Get()
  @RequirePermission('manage_imports')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.imports.list(tenant.companyId);
  }

  @Get(':id')
  @RequirePermission('manage_imports')
  get(@CurrentTenant() tenant: CurrentTenantContext, @Param('id') id: string) {
    return this.imports.getJob(tenant.companyId, id);
  }

  @Post(':id/revert')
  @RequirePermission('manage_imports')
  revert(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.imports.revert(tenant, id, idempotencyKey);
  }
}

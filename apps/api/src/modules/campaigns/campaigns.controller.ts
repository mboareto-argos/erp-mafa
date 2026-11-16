import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../tenancy/permissions.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CampaignsService } from './campaigns.service';
import {
  createCampaignSchema,
  markDeliverySchema,
  previewAudienceSchema,
  updateCampaignSchema,
  type CreateCampaignDto,
  type MarkDeliveryDto,
  type PreviewAudienceDto,
  type UpdateCampaignDto,
} from './dto/campaign.schema';

// Campanhas (BR §10.9, regras 9 a 12). Marketing é relacionamento com o
// cliente: usa as permissões de clientes (ver/gerenciar).
@Controller('campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  @RequirePermission('view_customers')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.campaigns.list(tenant.companyId);
  }

  @Post()
  @RequirePermission('manage_customers')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createCampaignSchema)) dto: CreateCampaignDto,
  ) {
    return this.campaigns.create(tenant, dto);
  }

  @Post('preview')
  @RequirePermission('view_customers')
  preview(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(previewAudienceSchema)) dto: PreviewAudienceDto,
  ) {
    return this.campaigns.preview(tenant.companyId, dto);
  }

  @Get(':id')
  @RequirePermission('view_customers')
  get(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaigns.get(tenant.companyId, id);
  }

  @Patch(':id')
  @RequirePermission('manage_customers')
  update(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCampaignSchema)) dto: UpdateCampaignDto,
  ) {
    return this.campaigns.update(tenant, id, dto);
  }

  @Patch(':id/archive')
  @RequirePermission('manage_customers')
  archive(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaigns.archive(tenant, id);
  }

  @Post(':id/deliveries')
  @RequirePermission('manage_customers')
  markDelivered(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(markDeliverySchema)) dto: MarkDeliveryDto,
  ) {
    return this.campaigns.markDelivered(tenant, id, dto);
  }
}

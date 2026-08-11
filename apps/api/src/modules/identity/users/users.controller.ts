import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant } from '../../tenancy/current-tenant.decorator';
import { JwtAuthGuard } from '../../tenancy/jwt-auth.guard';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { PermissionsGuard } from '../../tenancy/permissions.guard';
import { RequirePermission } from '../../tenancy/require-permission.decorator';
import { UsersService } from './users.service';
import { inviteUserSchema, type InviteUserDto } from './dto/invite-user.schema';
import {
  updateMembershipSchema,
  type UpdateMembershipDto,
} from './dto/update-membership.schema';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission('manage_users')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.users.listCompanyUsers(tenant.companyId);
  }

  @Post('invitations')
  @RequirePermission('manage_users')
  invite(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(inviteUserSchema)) dto: InviteUserDto,
  ) {
    return this.users.invite(tenant, dto);
  }

  @Patch(':id')
  @RequirePermission('manage_users')
  update(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMembershipSchema))
    dto: UpdateMembershipDto,
  ) {
    return this.users.updateMembership(tenant, id, dto);
  }
}

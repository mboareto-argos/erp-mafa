import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../tenancy/jwt-auth.guard';
import { PermissionsGuard } from '../tenancy/permissions.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import type { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { ExpensesService } from './expenses.service';
import {
  createExpenseSchema,
  type CreateExpenseDto,
} from './dto/create-expense.schema';

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  @RequirePermission('manage_expenses')
  create(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Body(new ZodValidationPipe(createExpenseSchema)) dto: CreateExpenseDto,
  ) {
    return this.expenses.create(tenant, dto);
  }

  @Get()
  @RequirePermission('view_expenses')
  list(@CurrentTenant() tenant: CurrentTenantContext) {
    return this.expenses.list(tenant.companyId);
  }

  @Get(':id')
  @RequirePermission('view_expenses')
  get(@CurrentTenant() tenant: CurrentTenantContext, @Param('id') id: string) {
    return this.expenses.get(tenant.companyId, id);
  }

  @Post(':id/cancel')
  @RequirePermission('manage_expenses')
  cancel(
    @CurrentTenant() tenant: CurrentTenantContext,
    @Param('id') id: string,
  ) {
    return this.expenses.cancel(tenant, id);
  }
}

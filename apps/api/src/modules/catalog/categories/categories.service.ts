import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreateCategoryDto } from './dto/create-category.schema';
import { UpdateCategoryDto } from './dto/update-category.schema';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenant: CurrentTenantContext, dto: CreateCategoryDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const category = await tx.category.create({
          data: {
            companyId: tenant.companyId,
            name: dto.name.trim(),
            createdBy: tenant.userId,
          },
        });
        await this.audit.record(tx, {
          companyId: tenant.companyId,
          userId: tenant.userId,
          action: 'category.created',
          entityType: 'category',
          entityId: category.id,
          afterData: { name: category.name, status: category.status },
        });
        return category;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError(
          'CATEGORY_NAME_IN_USE',
          'Já existe uma categoria com este nome.',
          HttpStatus.CONFLICT,
          'name',
        );
      }
      throw error;
    }
  }

  list(companyId: string) {
    return this.prisma.category.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    tenant: CurrentTenantContext,
    id: string,
    dto: UpdateCategoryDto,
  ) {
    const category = await this.find(tenant.companyId, id);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.category.update({
          where: { id },
          data: { name: dto.name.trim() },
        });
        await this.audit.record(tx, {
          companyId: tenant.companyId,
          userId: tenant.userId,
          action: 'category.updated',
          entityType: 'category',
          entityId: id,
          beforeData: { name: category.name },
          afterData: { name: updated.name },
        });
        return updated;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new AppError(
          'CATEGORY_NAME_IN_USE',
          'Já existe uma categoria com este nome.',
          HttpStatus.CONFLICT,
          'name',
        );
      throw error;
    }
  }

  // Nunca apaga — apenas alterna o estado e preserva todo o histórico.
  async changeStatus(
    tenant: CurrentTenantContext,
    id: string,
    status: 'active' | 'inactive',
  ) {
    const category = await this.find(tenant.companyId, id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id },
        data: { status },
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action:
          status === 'active' ? 'category.reactivated' : 'category.deactivated',
        entityType: 'category',
        entityId: id,
        beforeData: { status: category.status },
        afterData: { status },
      });
      return updated;
    });
  }

  private async find(companyId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!category) {
      throw new AppError(
        'CATEGORY_NOT_FOUND',
        'Categoria não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return category;
  }
}

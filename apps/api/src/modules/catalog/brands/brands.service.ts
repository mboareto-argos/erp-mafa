import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreateBrandDto } from './dto/create-brand.schema';
import { UpdateBrandDto } from './dto/update-brand.schema';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenant: CurrentTenantContext, dto: CreateBrandDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const brand = await tx.brand.create({
          data: {
            companyId: tenant.companyId,
            name: dto.name.trim(),
            createdBy: tenant.userId,
          },
        });
        await this.audit.record(tx, {
          companyId: tenant.companyId,
          userId: tenant.userId,
          action: 'brand.created',
          entityType: 'brand',
          entityId: brand.id,
          afterData: { name: brand.name, status: brand.status },
        });
        return brand;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError(
          'BRAND_NAME_IN_USE',
          'Já existe uma marca com este nome.',
          HttpStatus.CONFLICT,
          'name',
        );
      }
      throw error;
    }
  }

  list(companyId: string) {
    return this.prisma.brand.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async update(tenant: CurrentTenantContext, id: string, dto: UpdateBrandDto) {
    const brand = await this.find(tenant.companyId, id);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.brand.update({
          where: { id },
          data: { name: dto.name.trim() },
        });
        await this.audit.record(tx, {
          companyId: tenant.companyId,
          userId: tenant.userId,
          action: 'brand.updated',
          entityType: 'brand',
          entityId: id,
          beforeData: { name: brand.name },
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
          'BRAND_NAME_IN_USE',
          'Já existe uma marca com este nome.',
          HttpStatus.CONFLICT,
          'name',
        );
      throw error;
    }
  }

  async changeStatus(
    tenant: CurrentTenantContext,
    id: string,
    status: 'active' | 'inactive',
  ) {
    const brand = await this.find(tenant.companyId, id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.brand.update({
        where: { id },
        data: { status },
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: status === 'active' ? 'brand.reactivated' : 'brand.deactivated',
        entityType: 'brand',
        entityId: id,
        beforeData: { status: brand.status },
        afterData: { status },
      });
      return updated;
    });
  }

  private async find(companyId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!brand) {
      throw new AppError(
        'BRAND_NOT_FOUND',
        'Marca não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return brand;
  }
}

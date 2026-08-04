import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreateBrandDto } from './dto/create-brand.schema';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenant: CurrentTenantContext, dto: CreateBrandDto) {
    try {
      return await this.prisma.brand.create({
        data: {
          companyId: tenant.companyId,
          name: dto.name,
          createdBy: tenant.userId,
        },
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

  async deactivate(companyId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, companyId },
    });
    if (!brand) {
      throw new AppError(
        'BRAND_NOT_FOUND',
        'Marca não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.prisma.brand.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }
}

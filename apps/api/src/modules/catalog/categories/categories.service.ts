import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreateCategoryDto } from './dto/create-category.schema';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenant: CurrentTenantContext, dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
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

  // Nunca apaga — so inativa (RN 10.4.2 do Documento de Negocio).
  async deactivate(companyId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, companyId },
    });
    if (!category) {
      throw new AppError(
        'CATEGORY_NOT_FOUND',
        'Categoria não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.prisma.category.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }
}

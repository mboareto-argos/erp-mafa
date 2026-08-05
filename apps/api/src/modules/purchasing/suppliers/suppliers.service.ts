import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreateSupplierDto } from './dto/create-supplier.schema';
import { UpdateSupplierDto } from './dto/update-supplier.schema';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export type ListSuppliersParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenant: CurrentTenantContext, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: { companyId: tenant.companyId, createdBy: tenant.userId, ...dto },
    });
  }

  // Retrocompatível: sem `page`, devolve o array completo (usado pelo
  // seletor de fornecedor em Compras — não pode quebrar).
  async list(companyId: string, params: ListSuppliersParams = {}) {
    const where: Prisma.SupplierWhereInput = {
      companyId,
      deletedAt: null,
      ...(params.q
        ? { name: { contains: params.q, mode: 'insensitive' as const } }
        : {}),
    };

    if (!params.page) {
      return this.prisma.supplier.findMany({ where, orderBy: { name: 'asc' } });
    }

    const pageSize = Math.min(
      params.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const page = Math.max(params.page, 1);
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async update(companyId: string, id: string, dto: UpdateSupplierDto) {
    await this.findOwnedOrThrow(companyId, id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  // Nunca apaga — so inativa (mesmo padrao de Catalog, RN 10.5.2 do
  // Documento de Negocio: historico de compras permanece apos inativacao).
  async deactivate(companyId: string, id: string) {
    await this.findOwnedOrThrow(companyId, id);
    return this.prisma.supplier.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  async reactivate(companyId: string, id: string) {
    await this.findOwnedOrThrow(companyId, id);
    return this.prisma.supplier.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  private async findOwnedOrThrow(companyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
    });
    if (!supplier) {
      throw new AppError(
        'SUPPLIER_NOT_FOUND',
        'Fornecedor não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
    return supplier;
  }
}

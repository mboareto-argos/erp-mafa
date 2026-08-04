import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreateSupplierDto } from './dto/create-supplier.schema';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenant: CurrentTenantContext, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: { companyId: tenant.companyId, createdBy: tenant.userId, ...dto },
    });
  }

  list(companyId: string) {
    return this.prisma.supplier.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  // Nunca apaga — so inativa (mesmo padrao de Catalog, RN 10.5.2 do
  // Documento de Negocio: historico de compras permanece apos inativacao).
  async deactivate(companyId: string, id: string) {
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
    return this.prisma.supplier.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }
}

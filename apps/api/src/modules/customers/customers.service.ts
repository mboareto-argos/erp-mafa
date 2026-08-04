import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CreateCustomerDto } from './dto/create-customer.schema';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // RN 10.9.3: e-mail/telefone duplicado gera alerta, nunca bloqueio —
  // decisão de UX de frontend, o backend nunca rejeita por duplicidade.
  create(tenant: CurrentTenantContext, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { companyId: tenant.companyId, createdBy: tenant.userId, ...dto },
    });
  }

  list(companyId: string) {
    return this.prisma.customer.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  // Nunca apaga — histórico de compras permanece após inativação (RN 10.9.4).
  async deactivate(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });
    if (!customer) {
      throw new AppError(
        'CUSTOMER_NOT_FOUND',
        'Cliente não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.prisma.customer.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }
}

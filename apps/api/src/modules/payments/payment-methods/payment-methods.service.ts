import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreatePaymentMethodDto } from './dto/create-payment-method.schema';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenant: CurrentTenantContext, dto: CreatePaymentMethodDto) {
    return this.prisma.paymentMethod.create({
      data: { companyId: tenant.companyId, createdBy: tenant.userId, ...dto },
    });
  }

  list(companyId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async deactivate(companyId: string, id: string) {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id, companyId },
    });
    if (!method) {
      throw new AppError(
        'PAYMENT_METHOD_NOT_FOUND',
        'Forma de pagamento não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.prisma.paymentMethod.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }
}

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

  async detail(companyId: string, id: string) {
    const supplier = await this.findOwnedOrThrow(companyId, id);
    const purchases = await this.prisma.purchase.findMany({
      where: {
        companyId,
        supplierId: id,
        deletedAt: null,
        status: { in: ['ordered', 'partially_received', 'received'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        currency: true,
        exchangeRate: true,
        createdAt: true,
        items: {
          where: { deletedAt: null },
          select: {
            productVariantId: true,
            quantity: true,
            unitCostOriginCurrency: true,
          },
        },
        receipts: {
          where: { deletedAt: null },
          select: {
            costAllocations: {
              where: { deletedAt: null },
              select: { amount: true },
            },
          },
        },
      },
    });
    const payables = await this.prisma.payable.findMany({
      where: {
        companyId,
        supplierId: id,
        deletedAt: null,
        status: { in: ['pending', 'partially_paid'] },
      },
      select: { amountOriginal: true, amountPaid: true },
    });

    const productsSupplied = new Set<string>();
    const calculatedPurchases = purchases.map((purchase) => {
      const merchandiseOrigin = purchase.items.reduce((total, item) => {
        productsSupplied.add(item.productVariantId);
        return total.plus(item.quantity.mul(item.unitCostOriginCurrency));
      }, new Prisma.Decimal(0));
      const additionalCosts = purchase.receipts.reduce(
        (total, receipt) =>
          receipt.costAllocations.reduce(
            (receiptTotal, allocation) => receiptTotal.plus(allocation.amount),
            total,
          ),
        new Prisma.Decimal(0),
      );
      const exchangeRate =
        purchase.currency === 'BRL'
          ? new Prisma.Decimal(1)
          : (purchase.exchangeRate ?? new Prisma.Decimal(1));
      return {
        ...purchase,
        totalOrigin: merchandiseOrigin.plus(additionalCosts),
        totalCompanyCurrency: merchandiseOrigin
          .mul(exchangeRate)
          .plus(additionalCosts),
      };
    });
    const totalPurchased = calculatedPurchases.reduce(
      (total, purchase) => total.plus(purchase.totalCompanyCurrency),
      new Prisma.Decimal(0),
    );
    const outstandingBalance = payables.reduce(
      (total, payable) =>
        total.plus(payable.amountOriginal.minus(payable.amountPaid)),
      new Prisma.Decimal(0),
    );

    return {
      ...supplier,
      summary: {
        purchasesCount: calculatedPurchases.length,
        totalPurchased: totalPurchased.toString(),
        averagePurchase: calculatedPurchases.length
          ? totalPurchased.div(calculatedPurchases.length).toString()
          : '0',
        lastPurchaseAt: calculatedPurchases[0]?.createdAt ?? null,
        productsSupplied: productsSupplied.size,
        outstandingBalance: outstandingBalance.toString(),
      },
      recentPurchases: calculatedPurchases.slice(0, 5).map((purchase) => ({
        id: purchase.id,
        status: purchase.status,
        currency: purchase.currency,
        createdAt: purchase.createdAt,
        itemsCount: purchase.items.length,
        total: purchase.totalOrigin.toString(),
      })),
    };
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

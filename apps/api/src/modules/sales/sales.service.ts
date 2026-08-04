import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { InventoryService } from '../inventory/inventory.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CreateSaleDto } from './dto/create-sale.schema';
import { ConfirmSaleDto } from './dto/confirm-sale.schema';
import { ReturnSaleDto } from './dto/return-sale.schema';
import {
  calculateSaleTotals,
  calculateCmvAndProfit,
} from './sale-calculations';

const INCLUDE_DETAILS = {
  customer: true,
  items: true,
  payments: { include: { paymentMethod: true } },
  returns: { include: { items: true } },
} satisfies Prisma.SaleInclude;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  // Rascunho — RN 10.10.1: nao altera estoque nem custo.
  async create(tenant: CurrentTenantContext, dto: CreateSaleDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId: tenant.companyId },
      });
      if (!customer) {
        throw new AppError(
          'INVALID_CUSTOMER',
          'Cliente inválido.',
          HttpStatus.BAD_REQUEST,
          'customerId',
        );
      }
    }

    for (const item of dto.items) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: item.productVariantId, companyId: tenant.companyId },
      });
      if (!variant) {
        throw new AppError(
          'INVALID_PRODUCT_VARIANT',
          'Produto inválido.',
          HttpStatus.BAD_REQUEST,
          'items.productVariantId',
        );
      }
    }

    const { subtotal, total } = calculateSaleTotals(dto.items, dto.discount);

    return this.prisma.sale.create({
      data: {
        companyId: tenant.companyId,
        customerId: dto.customerId,
        channel: dto.channel,
        subtotal,
        discount: dto.discount,
        total,
        createdBy: tenant.userId,
        items: {
          create: dto.items.map((item) => ({
            companyId: tenant.companyId,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            createdBy: tenant.userId,
          })),
        },
      },
      include: INCLUDE_DETAILS,
    });
  }

  list(companyId: string) {
    return this.prisma.sale.findMany({
      where: { companyId, deletedAt: null },
      include: INCLUDE_DETAILS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(companyId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, companyId },
      include: INCLUDE_DETAILS,
    });
    if (!sale) {
      throw new AppError(
        'SALE_NOT_FOUND',
        'Venda não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return sale;
  }

  // Confirma a venda: congela o custo por item (RN 10.10.9), baixa estoque
  // via InventoryService.releaseStock() (TA-ARCH-003: mesma transacao),
  // registra os pagamentos e calcula CMV/lucro.
  async confirm(tenant: CurrentTenantContext, id: string, dto: ConfirmSaleDto) {
    const sale = await this.findByStatus(tenant.companyId, id, ['draft']);

    const paymentsTotal = dto.payments.reduce(
      (sum, payment) => sum.add(payment.amount),
      new Prisma.Decimal(0),
    );
    if (!paymentsTotal.equals(sale.total)) {
      throw new AppError(
        'PAYMENT_AMOUNT_MISMATCH',
        'A soma dos pagamentos precisa ser igual ao total da venda.',
        HttpStatus.BAD_REQUEST,
        'payments',
        {
          total: sale.total.toString(),
          paymentsTotal: paymentsTotal.toString(),
        },
      );
    }

    const paymentMethods = await Promise.all(
      dto.payments.map((payment) =>
        this.prisma.paymentMethod.findFirst({
          where: { id: payment.paymentMethodId, companyId: tenant.companyId },
        }),
      ),
    );
    paymentMethods.forEach((method, index) => {
      if (!method) {
        throw new AppError(
          'INVALID_PAYMENT_METHOD',
          'Forma de pagamento inválida.',
          HttpStatus.BAD_REQUEST,
          `payments[${index}].paymentMethodId`,
        );
      }
    });

    const saleId = sale.id;

    const updatedSale = await this.prisma.$transaction(async (tx) => {
      const costItems: {
        quantity: Prisma.Decimal;
        quantityReturned: Prisma.Decimal;
        unitCostAtSale: Prisma.Decimal;
      }[] = [];

      for (const item of sale.items) {
        const variant = await tx.productVariant.findUniqueOrThrow({
          where: { id: item.productVariantId },
        });
        const lastPrice = await tx.productPrice.findFirst({
          where: {
            companyId: tenant.companyId,
            productId: variant.productId,
            deletedAt: null,
          },
          orderBy: { effectiveFrom: 'desc' },
        });
        const unitCostAtSale = new Prisma.Decimal(lastPrice?.costPrice ?? 0);

        await this.inventory.releaseStock(tx, {
          companyId: tenant.companyId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitCost: unitCostAtSale,
          originType: 'sale',
          originId: saleId,
          createdBy: tenant.userId,
        });

        await tx.saleItem.update({
          where: { id: item.id },
          data: { unitCostAtSale },
        });

        costItems.push({
          quantity: new Prisma.Decimal(item.quantity),
          quantityReturned: new Prisma.Decimal(0),
          unitCostAtSale,
        });
      }

      for (const [index, payment] of dto.payments.entries()) {
        const method = paymentMethods[index]!;
        const amount = new Prisma.Decimal(payment.amount);
        const feeAmount = amount
          .mul(method.feeRate ?? 0)
          .div(100)
          .add(method.feeFixed ?? 0);
        await tx.salePayment.create({
          data: {
            companyId: tenant.companyId,
            saleId,
            paymentMethodId: payment.paymentMethodId,
            amount,
            feeAmount,
            netAmount: amount.sub(feeAmount),
            createdBy: tenant.userId,
          },
        });
      }

      const { cmv, grossProfit } = calculateCmvAndProfit(costItems, sale.total);

      return tx.sale.update({
        where: { id: saleId },
        data: {
          status: 'confirmed',
          cmvCalculated: cmv,
          grossProfitCalculated: grossProfit,
        },
        include: INCLUDE_DETAILS,
      });
    });

    return updatedSale;
  }

  // RN 10.10.20: venda nunca e' apagada apos confirmacao — cancelamento e'
  // um novo estado. Confirmada, estorna o estoque ainda nao devolvido
  // (RN 10.10.15).
  async cancel(tenant: CurrentTenantContext, id: string) {
    const sale = await this.findByStatus(tenant.companyId, id, [
      'draft',
      'confirmed',
    ]);

    if (sale.status === 'draft') {
      return this.prisma.sale.update({
        where: { id: sale.id },
        data: { status: 'cancelled' },
        include: INCLUDE_DETAILS,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const remaining = new Prisma.Decimal(item.quantity).sub(
          item.quantityReturned,
        );
        if (remaining.greaterThan(0)) {
          await this.inventory.restoreStock(tx, {
            companyId: tenant.companyId,
            productVariantId: item.productVariantId,
            quantity: remaining,
            originId: sale.id,
            createdBy: tenant.userId,
          });
        }
      }

      return tx.sale.update({
        where: { id: sale.id },
        data: { status: 'cancelled' },
        include: INCLUDE_DETAILS,
      });
    });
  }

  // Devolucao parcial ou total (RN 10.11). Item apto volta ao estoque
  // disponivel; item avariado so' e' registrado (ver plano da Fase 3 —
  // nao ha bucket de "estoque indisponivel" ainda). Recalcula receita
  // liquida e CMV/lucro proporcionalmente aos itens devolvidos
  // (RN 10.11.8 / "receita líquida deverá refletir devoluções").
  async returnItems(
    tenant: CurrentTenantContext,
    id: string,
    dto: ReturnSaleDto,
  ) {
    const sale = await this.findByStatus(tenant.companyId, id, [
      'confirmed',
      'partially_returned',
    ]);

    const items = sale.items.filter((item) =>
      dto.items.some((returned) => returned.saleItemId === item.id),
    );
    if (items.length !== dto.items.length) {
      throw new AppError(
        'INVALID_SALE_ITEM',
        'Um ou mais itens não pertencem a esta venda.',
        HttpStatus.BAD_REQUEST,
        'items',
      );
    }

    for (const returned of dto.items) {
      const item = items.find((i) => i.id === returned.saleItemId)!;
      const remaining = new Prisma.Decimal(item.quantity).sub(
        item.quantityReturned,
      );
      if (new Prisma.Decimal(returned.quantity).greaterThan(remaining)) {
        throw new AppError(
          'RETURN_QUANTITY_EXCEEDS_SOLD',
          'A quantidade devolvida não pode superar a quantidade ainda não devolvida.',
          HttpStatus.BAD_REQUEST,
          'items.quantity',
          { itemId: item.id, remaining: remaining.toString() },
        );
      }
    }

    const saleId = sale.id;

    const updatedSale = await this.prisma.$transaction(async (tx) => {
      const saleReturn = await tx.saleReturn.create({
        data: {
          companyId: tenant.companyId,
          saleId,
          reason: dto.reason,
          createdBy: tenant.userId,
        },
      });

      for (const returned of dto.items) {
        const item = items.find((i) => i.id === returned.saleItemId)!;

        await tx.saleReturnItem.create({
          data: {
            companyId: tenant.companyId,
            saleReturnId: saleReturn.id,
            saleItemId: item.id,
            productVariantId: item.productVariantId,
            quantity: returned.quantity,
            condition: returned.condition,
            createdBy: tenant.userId,
          },
        });

        await tx.saleItem.update({
          where: { id: item.id },
          data: { quantityReturned: { increment: returned.quantity } },
        });

        if (returned.condition === 'apt') {
          await this.inventory.restoreStock(tx, {
            companyId: tenant.companyId,
            productVariantId: item.productVariantId,
            quantity: returned.quantity,
            originId: saleReturn.id,
            createdBy: tenant.userId,
          });
        }
      }

      const refreshedItems = await tx.saleItem.findMany({ where: { saleId } });
      const remainingQuantityItems = refreshedItems.map((item) => {
        const originalQuantity = new Prisma.Decimal(item.quantity);
        const remaining = originalQuantity.sub(item.quantityReturned);
        const ratio = originalQuantity.isZero()
          ? new Prisma.Decimal(0)
          : remaining.div(originalQuantity);
        return {
          quantity: remaining,
          unitPrice: item.unitPrice,
          discount: new Prisma.Decimal(item.discount).mul(ratio),
        };
      });
      const { subtotal, total } = calculateSaleTotals(
        remainingQuantityItems,
        sale.discount,
      );
      const { cmv, grossProfit } = calculateCmvAndProfit(
        refreshedItems.map((item) => ({
          quantity: item.quantity,
          quantityReturned: item.quantityReturned,
          unitCostAtSale: item.unitCostAtSale ?? 0,
        })),
        total,
      );

      const fullyReturned = refreshedItems.every((item) =>
        new Prisma.Decimal(item.quantityReturned).greaterThanOrEqualTo(
          item.quantity,
        ),
      );

      return tx.sale.update({
        where: { id: saleId },
        data: {
          subtotal,
          total,
          cmvCalculated: cmv,
          grossProfitCalculated: grossProfit,
          status: fullyReturned ? 'returned' : 'partially_returned',
        },
        include: INCLUDE_DETAILS,
      });
    });

    return updatedSale;
  }

  private async findByStatus(
    companyId: string,
    id: string,
    allowedStatuses: SaleStatus[],
  ) {
    const sale = await this.get(companyId, id);
    if (!allowedStatuses.includes(sale.status)) {
      throw new AppError(
        'INVALID_SALE_STATUS',
        `Esta ação não é permitida para uma venda no status "${sale.status}".`,
        HttpStatus.CONFLICT,
        'status',
        { currentStatus: sale.status, allowed: allowedStatuses },
      );
    }
    return sale;
  }
}

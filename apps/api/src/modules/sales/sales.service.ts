import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { InventoryService } from '../inventory/inventory.service';
import { CashFlowService } from '../cash-flow/cash-flow.service';
import { AuditService } from '../audit/audit.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { CreateSaleDto } from './dto/create-sale.schema';
import { ConfirmSaleDto } from './dto/confirm-sale.schema';
import { ReturnSaleDto } from './dto/return-sale.schema';
import { ReceivablesService } from '../receivables/receivables.service';
import {
  calculateSaleTotals,
  calculateCmvAndProfit,
} from './sale-calculations';

const INCLUDE_DETAILS = {
  customer: true,
  items: {
    where: { deletedAt: null },
    include: { productVariant: { include: { product: true } } },
  },
  payments: { include: { paymentMethod: true } },
  receivables: {
    include: { payments: true },
    orderBy: { installmentNumber: 'asc' },
  },
  returns: { include: { items: true } },
} satisfies Prisma.SaleInclude;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly cashFlow: CashFlowService,
    private readonly audit: AuditService,
    private readonly receivables: ReceivablesService,
  ) {}

  // Rascunho — RN 10.10.1: nao altera estoque nem custo.
  async create(tenant: CurrentTenantContext, dto: CreateSaleDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: dto.customerId,
          companyId: tenant.companyId,
          status: 'active',
          deletedAt: null,
        },
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
        where: {
          id: item.productVariantId,
          companyId: tenant.companyId,
          product: { status: 'active', deletedAt: null },
        },
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

  // Apenas rascunhos podem ser alterados. Itens substituídos são inativados,
  // nunca apagados, preservando o histórico operacional.
  async updateDraft(
    tenant: CurrentTenantContext,
    id: string,
    dto: CreateSaleDto,
  ) {
    const sale = await this.findByStatus(tenant.companyId, id, ['draft']);

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: dto.customerId,
          companyId: tenant.companyId,
          status: 'active',
          deletedAt: null,
        },
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
        where: {
          id: item.productVariantId,
          companyId: tenant.companyId,
          product: { status: 'active', deletedAt: null },
        },
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

    return this.prisma.$transaction(async (tx) => {
      await tx.saleItem.updateMany({
        where: {
          saleId: sale.id,
          companyId: tenant.companyId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: {
          customerId: dto.customerId ?? null,
          channel: dto.channel,
          subtotal,
          discount: dto.discount,
          total,
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
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'sale.draft_updated',
        entityType: 'sale',
        entityId: sale.id,
        beforeData: {
          subtotal: sale.subtotal.toString(),
          total: sale.total.toString(),
        },
        afterData: { subtotal: subtotal.toString(), total: total.toString() },
      });
      return updated;
    });
  }

  // Reserva a venda inteira pra um cliente definido (RN "venda reservada
  // deve reservar estoque") — nunca baixa quantityAvailable, so' desloca
  // pra quantityReserved (InventoryService.reserveStock). Sem seleção
  // parcial de item: reserva sempre todos os itens do rascunho.
  async reserve(tenant: CurrentTenantContext, id: string) {
    const sale = await this.findByStatus(tenant.companyId, id, ['draft']);
    if (!sale.customerId) {
      throw new AppError(
        'CUSTOMER_REQUIRED_FOR_RESERVATION',
        'Selecione um cliente para reservar esta venda.',
        HttpStatus.BAD_REQUEST,
        'customerId',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await this.inventory.reserveStock(tx, {
          companyId: tenant.companyId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          saleId: sale.id,
          createdBy: tenant.userId,
        });
      }

      const reserved = await tx.sale.update({
        where: { id: sale.id },
        data: { status: 'reserved' },
        include: INCLUDE_DETAILS,
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'sale.reserved',
        entityType: 'sale',
        entityId: sale.id,
        beforeData: { status: sale.status },
        afterData: { status: reserved.status },
      });
      return reserved;
    });
  }

  // Confirma a venda: congela o custo por item (RN 10.10.9), baixa estoque
  // via InventoryService.releaseStock() (TA-ARCH-003: mesma transacao) — ou,
  // se a venda ja estava "reserved", converte a reserva existente em saida
  // via consumeReservation (RN "confirmada deve... converter a reserva em
  // saida", nunca reavalia quantityAvailable de novo) — registra os
  // pagamentos e calcula CMV/lucro.
  async confirm(tenant: CurrentTenantContext, id: string, dto: ConfirmSaleDto) {
    const sale = await this.findByStatus(tenant.companyId, id, [
      'draft',
      'reserved',
    ]);
    const wasReserved = sale.status === 'reserved';

    const paymentsTotal = dto.payments.reduce(
      (sum, payment) => sum.add(payment.amount),
      new Prisma.Decimal(0),
    );
    if (paymentsTotal.greaterThan(sale.total)) {
      throw new AppError(
        'PAYMENT_AMOUNT_MISMATCH',
        'A soma dos pagamentos não pode superar o total da venda.',
        HttpStatus.BAD_REQUEST,
        'payments',
        {
          total: sale.total.toString(),
          paymentsTotal: paymentsTotal.toString(),
        },
      );
    }
    const futureAmount = new Prisma.Decimal(sale.total).sub(paymentsTotal);
    if (futureAmount.greaterThan(0) && !dto.installmentPlan)
      throw new AppError(
        'PAYMENT_AMOUNT_MISMATCH',
        'A soma dos pagamentos deve cobrir o total ou o saldo precisa de uma agenda de parcelas.',
        HttpStatus.BAD_REQUEST,
        'payments',
        {
          total: sale.total.toString(),
          paymentsTotal: paymentsTotal.toString(),
        },
      );
    if (futureAmount.isZero() && dto.installmentPlan)
      throw new AppError(
        'INSTALLMENT_PLAN_NOT_APPLICABLE',
        'Não há saldo futuro para parcelar.',
        HttpStatus.BAD_REQUEST,
        'installmentPlan',
      );
    if (futureAmount.greaterThan(0) && !sale.customerId)
      throw new AppError(
        'CUSTOMER_REQUIRED_FOR_CREDIT',
        'Selecione um cliente para registrar uma venda a prazo.',
        HttpStatus.BAD_REQUEST,
        'customerId',
      );

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

        if (wasReserved) {
          await this.inventory.consumeReservation(tx, {
            companyId: tenant.companyId,
            productVariantId: item.productVariantId,
            saleId,
            unitCost: unitCostAtSale,
            createdBy: tenant.userId,
          });
        } else {
          await this.inventory.releaseStock(tx, {
            companyId: tenant.companyId,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitCost: unitCostAtSale,
            originType: 'sale',
            originId: saleId,
            createdBy: tenant.userId,
          });
        }

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
        const netAmount = amount.sub(feeAmount);
        const salePayment = await tx.salePayment.create({
          data: {
            companyId: tenant.companyId,
            saleId,
            paymentMethodId: payment.paymentMethodId,
            amount,
            feeAmount,
            netAmount,
            createdBy: tenant.userId,
          },
        });

        // Retrofit Fase 4: só gera FinancialTransaction se a forma de
        // pagamento tiver uma conta financeira vinculada — venda à vista
        // continua funcionando sem financeiro totalmente configurado.
        if (method.financialAccountId) {
          await this.cashFlow.recordTransaction(tx, {
            companyId: tenant.companyId,
            financialAccountId: method.financialAccountId,
            type: 'in',
            amount: netAmount,
            originType: 'sale_payment',
            originId: salePayment.id,
            createdBy: tenant.userId,
          });
        }
      }

      if (
        futureAmount.greaterThan(0) &&
        dto.installmentPlan &&
        sale.customerId
      ) {
        await this.receivables.createForSale(tx, {
          companyId: tenant.companyId,
          userId: tenant.userId,
          saleId,
          customerId: sale.customerId,
          amount: futureAmount,
          count: dto.installmentPlan.count,
          firstDueDate: dto.installmentPlan.firstDueDate,
        });
      }

      const { cmv, grossProfit } = calculateCmvAndProfit(costItems, sale.total);

      const confirmedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: 'confirmed',
          cmvCalculated: cmv,
          grossProfitCalculated: grossProfit,
        },
        include: INCLUDE_DETAILS,
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'sale.confirmed',
        entityType: 'sale',
        entityId: saleId,
        beforeData: { status: sale.status },
        afterData: {
          status: confirmedSale.status,
          total: confirmedSale.total.toString(),
          cmv: cmv.toString(),
          immediateAmount: paymentsTotal.toString(),
          futureAmount: futureAmount.toString(),
        },
      });
      return confirmedSale;
    });

    return updatedSale;
  }

  // RN 10.10.20: venda nunca e' apagada apos confirmacao — cancelamento e'
  // um novo estado. Confirmada, estorna o estoque ainda nao devolvido
  // (RN 10.10.15).
  async cancel(tenant: CurrentTenantContext, id: string) {
    const sale = await this.findByStatus(tenant.companyId, id, [
      'draft',
      'reserved',
      'confirmed',
    ]);

    if (sale.status === 'draft' || sale.status === 'reserved') {
      return this.prisma.$transaction(async (tx) => {
        if (sale.status === 'reserved') {
          await this.inventory.releaseReservation(tx, {
            companyId: tenant.companyId,
            saleId: sale.id,
            createdBy: tenant.userId,
          });
        }
        const cancelled = await tx.sale.update({
          where: { id: sale.id },
          data: { status: 'cancelled' },
          include: INCLUDE_DETAILS,
        });
        await this.audit.record(tx, {
          companyId: tenant.companyId,
          userId: tenant.userId,
          action: 'sale.cancelled',
          entityType: 'sale',
          entityId: sale.id,
          beforeData: { status: sale.status },
          afterData: { status: cancelled.status },
        });
        return cancelled;
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

      for (const payment of sale.payments) {
        const originalTransaction = await tx.financialTransaction.findFirst({
          where: {
            companyId: tenant.companyId,
            originType: 'sale_payment',
            originId: payment.id,
            type: 'in',
          },
        });
        if (originalTransaction) {
          await this.cashFlow.recordTransaction(tx, {
            companyId: tenant.companyId,
            financialAccountId: originalTransaction.financialAccountId,
            type: 'out',
            amount: originalTransaction.amount.negated(),
            originType: 'sale_payment',
            originId: payment.id,
            description: `Estorno do cancelamento da venda ${sale.id}`,
            createdBy: tenant.userId,
          });
        }
      }

      await this.reconcileFinancialReduction(
        tx,
        tenant,
        sale.id,
        sale.id,
        sale.receivables.reduce(
          (sum, receivable) => sum.add(receivable.amountOriginal),
          new Prisma.Decimal(0),
        ),
        'Cancelamento da venda a prazo',
      );

      const cancelled = await tx.sale.update({
        where: { id: sale.id },
        data: { status: 'cancelled' },
        include: INCLUDE_DETAILS,
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'sale.cancelled',
        entityType: 'sale',
        entityId: sale.id,
        beforeData: { status: sale.status },
        afterData: { status: cancelled.status },
      });
      return cancelled;
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

      const returnedSale = await tx.sale.update({
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
      await this.reconcileFinancialReduction(
        tx,
        tenant,
        saleId,
        saleReturn.id,
        new Prisma.Decimal(sale.total).sub(total),
        'Devolução de venda',
      );
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'sale.returned',
        entityType: 'sale',
        entityId: saleId,
        beforeData: { status: sale.status, total: sale.total.toString() },
        afterData: {
          status: returnedSale.status,
          total: returnedSale.total.toString(),
          returnId: saleReturn.id,
          items: dto.items,
        },
        reason: dto.reason,
      });
      return returnedSale;
    });

    return updatedSale;
  }

  private async reconcileFinancialReduction(
    tx: Prisma.TransactionClient,
    tenant: CurrentTenantContext,
    saleId: string,
    originId: string,
    reductionValue: Prisma.Decimal,
    description: string,
  ) {
    let reduction = new Prisma.Decimal(reductionValue);
    if (reduction.lessThanOrEqualTo(0)) return;
    const receivables = await tx.receivable.findMany({
      where: {
        companyId: tenant.companyId,
        saleId,
        status: { not: 'cancelled' },
      },
      orderBy: [{ installmentNumber: 'desc' }, { dueDate: 'desc' }],
    });
    for (const receivable of receivables) {
      if (reduction.lessThanOrEqualTo(0)) break;
      const open = new Prisma.Decimal(receivable.amountOriginal).sub(
        receivable.amountReceived,
      );
      const applied = Prisma.Decimal.min(open, reduction);
      if (applied.lessThanOrEqualTo(0)) continue;
      const amountOriginal = new Prisma.Decimal(receivable.amountOriginal).sub(
        applied,
      );
      const amountReceived = new Prisma.Decimal(receivable.amountReceived);
      const status = amountOriginal.isZero()
        ? 'cancelled'
        : amountReceived.greaterThanOrEqualTo(amountOriginal)
          ? 'received'
          : amountReceived.greaterThan(0)
            ? 'partially_received'
            : 'pending';
      await tx.receivable.update({
        where: { id: receivable.id },
        data: {
          amountOriginal,
          status,
          cancelReason: status === 'cancelled' ? description : undefined,
        },
      });
      reduction = reduction.sub(applied);
    }
    if (reduction.lessThanOrEqualTo(0)) return;
    const incoming = await tx.financialTransaction.findFirst({
      where: {
        companyId: tenant.companyId,
        type: 'in',
        OR: [
          {
            originType: 'sale_payment',
            originId: {
              in: (
                await tx.salePayment.findMany({
                  where: { saleId },
                  select: { id: true },
                })
              ).map((item) => item.id),
            },
          },
          {
            originType: 'receivable_payment',
            originId: {
              in: (
                await tx.receivablePayment.findMany({
                  where: { receivable: { saleId } },
                  select: { id: true },
                })
              ).map((item) => item.id),
            },
          },
        ],
      },
      orderBy: { occurredAt: 'desc' },
    });
    // Formas legadas podem não ter conta financeira vinculada; nesse caso a
    // confirmação também não criou caixa, portanto não há lançamento a estornar.
    if (!incoming) return;
    await this.cashFlow.recordTransaction(tx, {
      companyId: tenant.companyId,
      financialAccountId: incoming.financialAccountId,
      type: 'out',
      amount: reduction.negated(),
      originType: 'sale_return',
      originId,
      description,
      createdBy: tenant.userId,
    });
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

import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { InventoryService } from '../../inventory/inventory.service';
import { AuditService } from '../../audit/audit.service';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreatePurchaseDto } from './dto/create-purchase.schema';
import { ReceivePurchaseDto } from './dto/receive-purchase.schema';
import { allocateAdditionalCosts, ReceivedItemInput } from './cost-allocation';
import { PayablesService } from '../../payables/payables.service';

const INCLUDE_DETAILS = {
  supplier: true,
  items: {
    where: { deletedAt: null },
    include: { productVariant: { include: { product: true } } },
  },
  receipts: { include: { items: true, costAllocations: true } },
  payables: {
    include: { payments: true },
    orderBy: { installmentNumber: 'asc' },
  },
} satisfies Prisma.PurchaseInclude;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
    private readonly payables: PayablesService,
  ) {}

  // Rascunho — RN 10.6.1: nao altera estoque.
  async create(tenant: CurrentTenantContext, dto: CreatePurchaseDto) {
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: {
          id: dto.supplierId,
          companyId: tenant.companyId,
          status: 'active',
          deletedAt: null,
        },
      });
      if (!supplier) {
        throw new AppError(
          'INVALID_SUPPLIER',
          'Fornecedor inválido.',
          HttpStatus.BAD_REQUEST,
          'supplierId',
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

    const purchase = await this.prisma.purchase.create({
      data: {
        companyId: tenant.companyId,
        supplierId: dto.supplierId,
        currency: dto.currency,
        exchangeRate: dto.exchangeRate,
        exchangeRateDate: dto.exchangeRate ? new Date() : undefined,
        createdBy: tenant.userId,
        items: {
          create: dto.items.map((item) => ({
            companyId: tenant.companyId,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitCostOriginCurrency: item.unitCostOriginCurrency,
            createdBy: tenant.userId,
          })),
        },
      },
      include: INCLUDE_DETAILS,
    });

    return purchase;
  }

  list(companyId: string) {
    return this.prisma.purchase.findMany({
      where: { companyId, deletedAt: null },
      include: INCLUDE_DETAILS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(companyId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, companyId },
      include: INCLUDE_DETAILS,
    });
    if (!purchase) {
      throw new AppError(
        'PURCHASE_NOT_FOUND',
        'Compra não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    return purchase;
  }

  // Rascunhos podem ser revistos sem impacto em estoque. Os itens anteriores
  // são inativados para preservar o histórico, seguindo o padrão de Vendas.
  async updateDraft(
    tenant: CurrentTenantContext,
    id: string,
    dto: CreatePurchaseDto,
  ) {
    const purchase = await this.findByStatus(tenant.companyId, id, ['draft']);

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: {
          id: dto.supplierId,
          companyId: tenant.companyId,
          status: 'active',
          deletedAt: null,
        },
      });
      if (!supplier) {
        throw new AppError(
          'INVALID_SUPPLIER',
          'Fornecedor inválido.',
          HttpStatus.BAD_REQUEST,
          'supplierId',
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

    return this.prisma.$transaction(async (tx) => {
      await tx.purchaseItem.updateMany({
        where: {
          purchaseId: purchase.id,
          companyId: tenant.companyId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      const updated = await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          supplierId: dto.supplierId ?? null,
          currency: dto.currency,
          exchangeRate: dto.exchangeRate,
          exchangeRateDate: dto.exchangeRate ? new Date() : null,
          items: {
            create: dto.items.map((item) => ({
              companyId: tenant.companyId,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              unitCostOriginCurrency: item.unitCostOriginCurrency,
              createdBy: tenant.userId,
            })),
          },
        },
        include: INCLUDE_DETAILS,
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'purchase.draft_updated',
        entityType: 'purchase',
        entityId: purchase.id,
        beforeData: {
          supplierId: purchase.supplierId,
          itemCount: purchase.items.length,
        },
        afterData: {
          supplierId: updated.supplierId,
          itemCount: updated.items.length,
        },
      });
      return updated;
    });
  }

  // RN 10.6.2: marcada como pedido tambem nao aumenta o estoque disponivel
  // — so' marca "em transito" (RN-STK-018), informativo, fora da formula
  // disponivel = fisico - reservado.
  async order(companyId: string, id: string) {
    const purchase = await this.findByStatus(companyId, id, ['draft']);
    return this.prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await this.inventory.markInTransit(tx, {
          companyId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
        });
      }
      return tx.purchase.update({
        where: { id: purchase.id },
        data: { status: 'ordered' },
        include: INCLUDE_DETAILS,
      });
    });
  }

  // Recebimento total ou parcial (RN 10.6.3/10.6.4/10.6.5). Delega o efeito
  // de estoque ao InventoryService.receiveGoods() dentro da MESMA transacao
  // (TA-ARCH-003) — Purchasing nunca escreve em StockBalance/StockMovement.
  async receive(
    tenant: CurrentTenantContext,
    id: string,
    dto: ReceivePurchaseDto,
  ) {
    const purchase = await this.findByStatus(tenant.companyId, id, [
      'ordered',
      'partially_received',
    ]);

    const items = purchase.items.filter((item) =>
      dto.items.some((received) => received.purchaseItemId === item.id),
    );
    if (items.length !== dto.items.length) {
      throw new AppError(
        'INVALID_PURCHASE_ITEM',
        'Um ou mais itens não pertencem a esta compra.',
        HttpStatus.BAD_REQUEST,
        'items',
      );
    }

    for (const received of dto.items) {
      const item = items.find((i) => i.id === received.purchaseItemId)!;
      const alreadyReceived = new Prisma.Decimal(item.quantityReceived);
      const willReceive = alreadyReceived.add(received.quantityReceived);
      if (willReceive.greaterThan(item.quantity)) {
        throw new AppError(
          'RECEIVED_QUANTITY_EXCEEDS_ORDERED',
          'A quantidade recebida não pode superar a quantidade comprada.',
          HttpStatus.BAD_REQUEST,
          'items.quantityReceived',
          {
            itemId: item.id,
            ordered: item.quantity.toString(),
            alreadyReceived: alreadyReceived.toString(),
          },
        );
      }
    }

    const receivedItemInputs: ReceivedItemInput[] = dto.items.map(
      (received) => {
        const item = items.find((i) => i.id === received.purchaseItemId)!;
        return {
          id: item.id,
          quantityReceived: received.quantityReceived,
          unitCostOriginCurrency: item.unitCostOriginCurrency,
        };
      },
    );
    const totalAdditionalCosts = dto.additionalCosts.reduce(
      (sum, cost) => sum.add(cost.amount),
      new Prisma.Decimal(0),
    );
    const allocations = allocateAdditionalCosts(
      receivedItemInputs,
      totalAdditionalCosts,
    );
    // Recalculada por tipo de custo (mesmo itemShare) so' para persistir o
    // detalhe por tipo em purchase_cost_allocations — a soma por item bate
    // com `allocations` acima.
    const allocationsByCostType = dto.additionalCosts.map((cost) => ({
      cost,
      perItem: allocateAdditionalCosts(receivedItemInputs, cost.amount),
    }));

    const purchaseId = purchase.id;

    const updatedPurchase = await this.prisma.$transaction(async (tx) => {
      const receipt = await tx.purchaseReceipt.create({
        data: {
          companyId: tenant.companyId,
          purchaseId,
          createdBy: tenant.userId,
        },
      });

      for (const received of dto.items) {
        const item = items.find((i) => i.id === received.purchaseItemId)!;
        const allocation = allocations.find((a) => a.id === item.id)!;

        const receiptItem = await tx.purchaseReceiptItem.create({
          data: {
            companyId: tenant.companyId,
            purchaseReceiptId: receipt.id,
            purchaseItemId: item.id,
            productVariantId: item.productVariantId,
            quantityReceived: received.quantityReceived,
            unitCostFinal: allocation.unitCostFinal,
            createdBy: tenant.userId,
          },
        });

        for (const { cost, perItem } of allocationsByCostType) {
          const perItemAllocation = perItem.find((a) => a.id === item.id)!;
          await tx.purchaseCostAllocation.create({
            data: {
              companyId: tenant.companyId,
              purchaseReceiptId: receipt.id,
              purchaseReceiptItemId: receiptItem.id,
              type: cost.type,
              amount: perItemAllocation.allocatedAdditionalCost,
              createdBy: tenant.userId,
            },
          });
        }

        await tx.purchaseItem.update({
          where: { id: item.id },
          data: { quantityReceived: { increment: received.quantityReceived } },
        });

        await this.inventory.receiveGoods(tx, {
          companyId: tenant.companyId,
          productVariantId: item.productVariantId,
          quantity: received.quantityReceived,
          unitCost: allocation.unitCostFinal,
          originType: 'purchase',
          originId: purchaseId,
          createdBy: tenant.userId,
        });

        await this.inventory.clearInTransit(tx, {
          companyId: tenant.companyId,
          productVariantId: item.productVariantId,
          quantity: received.quantityReceived,
        });
      }

      const refreshedItems = await tx.purchaseItem.findMany({
        where: { purchaseId },
      });
      const fullyReceived = refreshedItems.every((item) =>
        new Prisma.Decimal(item.quantityReceived).greaterThanOrEqualTo(
          item.quantity,
        ),
      );

      const receivedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: { status: fullyReceived ? 'received' : 'partially_received' },
        include: INCLUDE_DETAILS,
      });
      if (dto.installmentPlan) {
        if (!fullyReceived)
          throw new AppError(
            'PURCHASE_INSTALLMENTS_REQUIRE_FULL_RECEIPT',
            'As parcelas devem ser geradas na conclusão do recebimento.',
            HttpStatus.CONFLICT,
            'installmentPlan',
          );
        if (!purchase.supplierId)
          throw new AppError(
            'SUPPLIER_REQUIRED_FOR_CREDIT',
            'Selecione um fornecedor para registrar a compra a prazo.',
            HttpStatus.BAD_REQUEST,
            'supplierId',
          );
        const existingPayables = await tx.payable.count({
          where: { companyId: tenant.companyId, purchaseId },
        });
        if (existingPayables > 0)
          throw new AppError(
            'PURCHASE_PAYABLES_ALREADY_CREATED',
            'As parcelas desta compra já foram geradas.',
            HttpStatus.CONFLICT,
          );
        const merchandiseOrigin = refreshedItems.reduce(
          (sum, item) =>
            sum.add(
              new Prisma.Decimal(item.quantity).mul(
                item.unitCostOriginCurrency,
              ),
            ),
          new Prisma.Decimal(0),
        );
        const merchandiseBase =
          purchase.currency === 'BRL'
            ? merchandiseOrigin
            : merchandiseOrigin.mul(purchase.exchangeRate ?? 1);
        const costs = await tx.purchaseCostAllocation.aggregate({
          where: {
            companyId: tenant.companyId,
            purchaseReceipt: { purchaseId },
          },
          _sum: { amount: true },
        });
        await this.payables.createForPurchase(tx, {
          companyId: tenant.companyId,
          userId: tenant.userId,
          purchaseId,
          supplierId: purchase.supplierId,
          amount: merchandiseBase.add(costs._sum.amount ?? 0),
          count: dto.installmentPlan.count,
          firstDueDate: dto.installmentPlan.firstDueDate,
        });
      }
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'purchase.received',
        entityType: 'purchase',
        entityId: purchaseId,
        beforeData: { status: purchase.status },
        afterData: {
          status: receivedPurchase.status,
          receiptId: receipt.id,
          items: dto.items.map((item) => ({
            purchaseItemId: item.purchaseItemId,
            quantityReceived: item.quantityReceived,
          })),
          installments: dto.installmentPlan?.count ?? 0,
        },
      });
      return tx.purchase.findUniqueOrThrow({
        where: { id: purchaseId },
        include: INCLUDE_DETAILS,
      });
    });

    return updatedPurchase;
  }

  // So permite cancelar antes do recebimento — estornar uma compra ja
  // recebida (RN 10.6.6) exige reverter estoque/custo e nao esta
  // implementado nesta fase (decisao explicita, ver plano da Fase 2).
  async cancel(tenant: CurrentTenantContext, id: string) {
    const purchase = await this.get(tenant.companyId, id);
    if (purchase.status === 'cancelled') {
      throw new AppError(
        'PURCHASE_ALREADY_CANCELLED',
        'Esta compra já está cancelada.',
        HttpStatus.CONFLICT,
      );
    }
    if (
      purchase.status === 'partially_received' ||
      purchase.status === 'received'
    ) {
      throw new AppError(
        'PURCHASE_ALREADY_RECEIVED',
        'Não é possível cancelar uma compra já recebida — o estorno de estoque ainda não está implementado.',
        HttpStatus.CONFLICT,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      // "draft" nunca chamou order(), entao nunca incrementou em transito —
      // so' "ordered" precisa liberar.
      if (purchase.status === 'ordered') {
        for (const item of purchase.items) {
          await this.inventory.clearInTransit(tx, {
            companyId: tenant.companyId,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          });
        }
      }
      const cancelled = await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: 'cancelled' },
        include: INCLUDE_DETAILS,
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'purchase.cancelled',
        entityType: 'purchase',
        entityId: purchase.id,
        beforeData: { status: purchase.status },
        afterData: { status: cancelled.status },
      });
      return cancelled;
    });
  }

  async reverse(tenant: CurrentTenantContext, id: string, reason: string) {
    const purchase = await this.get(tenant.companyId, id);
    if (!['received', 'partially_received'].includes(purchase.status))
      throw new AppError(
        'PURCHASE_NOT_RECEIVED',
        'Somente uma compra recebida pode ser estornada.',
        HttpStatus.CONFLICT,
      );
    const payables = await this.prisma.payable.findMany({
      where: {
        companyId: tenant.companyId,
        purchaseId: id,
        status: { not: 'cancelled' },
      },
    });
    if (
      payables.some((payable) =>
        new Prisma.Decimal(payable.amountPaid).greaterThan(0),
      )
    )
      throw new AppError(
        'PURCHASE_REVERSAL_HAS_PAYMENTS',
        'Estorne os pagamentos vinculados antes de devolver a compra.',
        HttpStatus.CONFLICT,
      );
    return this.prisma.$transaction(async (tx) => {
      for (const receipt of purchase.receipts)
        for (const item of receipt.items)
          await this.inventory.reversePurchaseReceipt(tx, {
            companyId: tenant.companyId,
            productVariantId: item.productVariantId,
            quantity: item.quantityReceived,
            receivedUnitCost: item.unitCostFinal,
            originId: id,
            createdBy: tenant.userId,
          });
      await tx.payable.updateMany({
        where: {
          companyId: tenant.companyId,
          purchaseId: id,
          status: 'pending',
        },
        data: { status: 'cancelled', cancelReason: reason },
      });
      const reversed = await tx.purchase.update({
        where: { id },
        data: { status: 'cancelled' },
        include: INCLUDE_DETAILS,
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'purchase.reversed',
        entityType: 'purchase',
        entityId: id,
        beforeData: { status: purchase.status },
        afterData: {
          status: 'cancelled',
          reversedReceipts: purchase.receipts.length,
        },
        reason,
      });
      return reversed;
    });
  }

  private async findByStatus(
    companyId: string,
    id: string,
    allowedStatuses: PurchaseStatus[],
  ) {
    const purchase = await this.get(companyId, id);
    if (!allowedStatuses.includes(purchase.status)) {
      throw new AppError(
        'INVALID_PURCHASE_STATUS',
        `Esta ação não é permitida para uma compra no status "${purchase.status}".`,
        HttpStatus.CONFLICT,
        'status',
        { currentStatus: purchase.status, allowed: allowedStatuses },
      );
    }
    return purchase;
  }
}

import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, StockMovementOriginType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { ProductsService } from '../catalog/products/products.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { calculateMovingAverageCost } from './moving-average';

// Ajustes acima deste limiar exigem permissao elevada (RN 10.7.10 do
// Documento de Negocio). Valor fixo por enquanto — nao ha configuracao por
// empresa ainda (docs/architecture/overview.md §10.22, fora de escopo desta
// fase); so marca `requiresApproval`, sem bloquear a operacao.
const ADJUSTMENT_APPROVAL_THRESHOLD = 50;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  // Chamado pelo Purchasing dentro da MESMA transacao do recebimento
  // (TA-ARCH-003: compra recebida e estoque baixado sao atomicos) — nunca
  // abre transacao propria. Cria a movimentacao, atualiza o saldo
  // materializado e recalcula o custo medio movel (RN 11.4).
  async receiveGoods(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productVariantId: string;
      quantity: Prisma.Decimal.Value;
      unitCost: Prisma.Decimal.Value;
      originType: StockMovementOriginType;
      originId: string;
      createdBy?: string;
    },
  ) {
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: params.productVariantId },
    });

    const [balance, lastPrice] = await Promise.all([
      tx.stockBalance.findUnique({
        where: {
          companyId_productVariantId: {
            companyId: params.companyId,
            productVariantId: params.productVariantId,
          },
        },
      }),
      tx.productPrice.findFirst({
        where: {
          companyId: params.companyId,
          productId: variant.productId,
          deletedAt: null,
        },
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]);

    const previousQuantity = new Prisma.Decimal(
      balance?.quantityAvailable ?? 0,
    ).add(balance?.quantityReserved ?? 0);
    const previousAvgCost = new Prisma.Decimal(lastPrice?.costPrice ?? 0);
    const receivedQuantity = new Prisma.Decimal(params.quantity);
    const receivedUnitCost = new Prisma.Decimal(params.unitCost);

    const newAvgCost = calculateMovingAverageCost({
      previousQuantity,
      previousAvgCost,
      receivedQuantity,
      receivedUnitCost,
    });

    const [movement] = await Promise.all([
      tx.stockMovement.create({
        data: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
          type: 'in',
          quantity: receivedQuantity,
          unitCost: receivedUnitCost,
          originType: params.originType,
          originId: params.originId,
          createdBy: params.createdBy,
        },
      }),
      tx.stockBalance.upsert({
        where: {
          companyId_productVariantId: {
            companyId: params.companyId,
            productVariantId: params.productVariantId,
          },
        },
        create: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
          quantityAvailable: receivedQuantity,
        },
        update: {
          quantityAvailable: { increment: receivedQuantity },
        },
      }),
    ]);

    await this.products.appendCostHistory(tx, {
      companyId: params.companyId,
      productId: variant.productId,
      productVariantId: params.productVariantId,
      costPrice: newAvgCost,
      createdBy: params.createdBy,
    });

    return { movement, newAvgCost };
  }

  // Ajuste manual pontual (RN 10.7.9/10.7.10) — abre a propria transacao,
  // ninguem mais participa dela nesta fase.
  async adjustStock(
    tenant: CurrentTenantContext,
    dto: { productVariantId: string; quantity: number; reason: string },
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: dto.productVariantId, companyId: tenant.companyId },
    });
    if (!variant) {
      throw new AppError(
        'PRODUCT_VARIANT_NOT_FOUND',
        'Produto não encontrado.',
        HttpStatus.NOT_FOUND,
        'productVariantId',
      );
    }

    const balance = await this.prisma.stockBalance.findUnique({
      where: {
        companyId_productVariantId: {
          companyId: tenant.companyId,
          productVariantId: dto.productVariantId,
        },
      },
    });

    const currentAvailable = new Prisma.Decimal(
      balance?.quantityAvailable ?? 0,
    );
    const delta = new Prisma.Decimal(dto.quantity);
    const resultingAvailable = currentAvailable.add(delta);

    // Uma saida nunca deixa o estoque disponivel negativo, salvo permissao
    // explicita (RN 10.7.6) — essa configuracao ainda nao existe, entao o
    // MVP so bloqueia.
    if (resultingAvailable.isNegative()) {
      throw new AppError(
        'STOCK_INSUFFICIENT',
        'O ajuste deixaria o estoque disponível negativo.',
        HttpStatus.BAD_REQUEST,
        'quantity',
        { available: currentAvailable.toString(), requested: delta.toString() },
      );
    }

    const stockAdjustmentId = randomUUID();
    const requiresApproval = delta
      .abs()
      .greaterThan(ADJUSTMENT_APPROVAL_THRESHOLD);

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          companyId: tenant.companyId,
          productVariantId: dto.productVariantId,
          type: 'adjustment',
          quantity: delta,
          originType: 'adjustment',
          originId: stockAdjustmentId,
          createdBy: tenant.userId,
        },
      });

      const adjustment = await tx.stockAdjustment.create({
        data: {
          id: stockAdjustmentId,
          companyId: tenant.companyId,
          productVariantId: dto.productVariantId,
          stockMovementId: movement.id,
          reason: dto.reason,
          requiresApproval,
          // Sem fila de aprovacao real ainda — o proprio ator aprova no MVP.
          approvedBy: tenant.userId,
          createdBy: tenant.userId,
        },
      });

      await tx.stockBalance.upsert({
        where: {
          companyId_productVariantId: {
            companyId: tenant.companyId,
            productVariantId: dto.productVariantId,
          },
        },
        create: {
          companyId: tenant.companyId,
          productVariantId: dto.productVariantId,
          quantityAvailable: delta,
        },
        update: {
          quantityAvailable: { increment: delta },
        },
      });

      return { movement, adjustment };
    });
  }

  getBalances(companyId: string) {
    return this.prisma.stockBalance.findMany({
      where: { companyId },
      include: { productVariant: { include: { product: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  getMovements(companyId: string, productVariantId?: string) {
    return this.prisma.stockMovement.findMany({
      where: { companyId, ...(productVariantId ? { productVariantId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Compara o saldo disponivel somado por produto com o estoque minimo
  // (RN 10.7.8) — sem pub/sub de notificacao ainda (Notifications e' fase
  // futura), so uma consulta de leitura.
  async getLowStock(companyId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        status: 'active',
        minStock: { not: null },
        deletedAt: null,
      },
      include: { variants: { include: { stockBalances: true } } },
    });

    return products
      .map((product) => {
        const available = product.variants.reduce(
          (sum, variant) =>
            sum.add(
              variant.stockBalances.reduce(
                (variantSum, balance) =>
                  variantSum.add(balance.quantityAvailable),
                new Prisma.Decimal(0),
              ),
            ),
          new Prisma.Decimal(0),
        );
        return { product, quantityAvailable: available };
      })
      .filter(({ product, quantityAvailable }) =>
        quantityAvailable.lessThanOrEqualTo(product.minStock!),
      )
      .map(({ product, quantityAvailable }) => ({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        minStock: product.minStock,
        quantityAvailable,
      }));
  }
}

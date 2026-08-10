import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, StockMovementOriginType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
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
    private readonly audit: AuditService,
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

  // Chamado pelo Sales dentro da MESMA transacao da confirmacao da venda
  // (TA-ARCH-003) — baixa estoque na venda (RN 10.10.3). Nunca deixa o
  // disponivel negativo (RN 10.10.23), nunca mexe no custo medio movel
  // (RN 11.4 e' so' sobre compras).
  async releaseStock(
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
    const balance = await tx.stockBalance.findUnique({
      where: {
        companyId_productVariantId: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
        },
      },
    });

    const currentAvailable = new Prisma.Decimal(
      balance?.quantityAvailable ?? 0,
    );
    const quantity = new Prisma.Decimal(params.quantity);

    const company = await tx.company.findUnique({
      where: { id: params.companyId },
      select: { allowNegativeStock: true },
    });
    if (currentAvailable.lessThan(quantity) && !company?.allowNegativeStock) {
      throw new AppError(
        'STOCK_INSUFFICIENT',
        'Quantidade solicitada maior que o estoque disponível.',
        HttpStatus.BAD_REQUEST,
        'quantity',
        {
          available: currentAvailable.toString(),
          requested: quantity.toString(),
        },
      );
    }

    const [movement] = await Promise.all([
      tx.stockMovement.create({
        data: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
          type: 'out',
          quantity: quantity.negated(),
          unitCost: params.unitCost,
          originType: params.originType,
          originId: params.originId,
          createdBy: params.createdBy,
        },
      }),
      tx.stockBalance.update({
        where: {
          companyId_productVariantId: {
            companyId: params.companyId,
            productVariantId: params.productVariantId,
          },
        },
        data: { quantityAvailable: { decrement: quantity } },
      }),
    ]);

    return { movement };
  }

  // Chamado pelo Sales dentro da MESMA transacao (TA-ARCH-003) quando uma
  // venda vira "reserved" — desloca de quantityAvailable pra
  // quantityReserved (mesmo total fisico, "estoque reservado nao pode ser
  // considerado disponivel" pra OUTRA venda).
  async reserveStock(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productVariantId: string;
      quantity: Prisma.Decimal.Value;
      saleId: string;
      createdBy?: string;
    },
  ) {
    const balance = await tx.stockBalance.findUnique({
      where: {
        companyId_productVariantId: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
        },
      },
    });

    const currentAvailable = new Prisma.Decimal(
      balance?.quantityAvailable ?? 0,
    );
    const quantity = new Prisma.Decimal(params.quantity);

    if (currentAvailable.lessThan(quantity)) {
      throw new AppError(
        'STOCK_INSUFFICIENT',
        'Quantidade solicitada maior que o estoque disponível.',
        HttpStatus.BAD_REQUEST,
        'quantity',
        {
          available: currentAvailable.toString(),
          requested: quantity.toString(),
        },
      );
    }

    const [reservation] = await Promise.all([
      tx.stockReservation.create({
        data: {
          companyId: params.companyId,
          saleId: params.saleId,
          productVariantId: params.productVariantId,
          quantity,
          createdBy: params.createdBy,
        },
      }),
      tx.stockMovement.create({
        data: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
          type: 'reservation',
          quantity,
          originType: 'sale',
          originId: params.saleId,
          createdBy: params.createdBy,
        },
      }),
      tx.stockBalance.update({
        where: {
          companyId_productVariantId: {
            companyId: params.companyId,
            productVariantId: params.productVariantId,
          },
        },
        data: {
          quantityAvailable: { decrement: quantity },
          quantityReserved: { increment: quantity },
        },
      }),
    ]);

    return { reservation };
  }

  // Libera reservas ativas de uma venda (cancelamento antes de confirmar —
  // RN "cancelamento deve... liberar a reserva"). Devolve pra
  // quantityAvailable o que reserveStock tinha deslocado.
  async releaseReservation(
    tx: Prisma.TransactionClient,
    params: { companyId: string; saleId: string; createdBy?: string },
  ) {
    const reservations = await tx.stockReservation.findMany({
      where: {
        companyId: params.companyId,
        saleId: params.saleId,
        status: 'active',
      },
    });

    for (const reservation of reservations) {
      await Promise.all([
        tx.stockMovement.create({
          data: {
            companyId: params.companyId,
            productVariantId: reservation.productVariantId,
            type: 'release',
            quantity: reservation.quantity.negated(),
            originType: 'sale',
            originId: params.saleId,
            createdBy: params.createdBy,
          },
        }),
        tx.stockBalance.update({
          where: {
            companyId_productVariantId: {
              companyId: params.companyId,
              productVariantId: reservation.productVariantId,
            },
          },
          data: {
            quantityAvailable: { increment: reservation.quantity },
            quantityReserved: { decrement: reservation.quantity },
          },
        }),
        tx.stockReservation.update({
          where: { id: reservation.id },
          data: { status: 'released' },
        }),
      ]);
    }

    return { reservations };
  }

  // Confirma uma venda que estava "reserved" (RN "confirmada deve...
  // converter a reserva em saida") — reserveStock ja tinha decrementado
  // quantityAvailable no momento da reserva, entao aqui so' baixa
  // quantityReserved (nunca mexe em quantityAvailable de novo).
  // Por item (nao em lote pra venda inteira) porque cada item pode ter um
  // unitCostAtSale diferente, igual releaseStock — chamado no lugar dele
  // quando a venda ja estava "reserved".
  async consumeReservation(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productVariantId: string;
      saleId: string;
      unitCost: Prisma.Decimal.Value;
      createdBy?: string;
    },
  ) {
    const reservation = await tx.stockReservation.findFirstOrThrow({
      where: {
        companyId: params.companyId,
        saleId: params.saleId,
        productVariantId: params.productVariantId,
        status: 'active',
      },
    });

    const [movement] = await Promise.all([
      tx.stockMovement.create({
        data: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
          type: 'out',
          quantity: reservation.quantity.negated(),
          unitCost: params.unitCost,
          originType: 'sale',
          originId: params.saleId,
          createdBy: params.createdBy,
        },
      }),
      tx.stockBalance.update({
        where: {
          companyId_productVariantId: {
            companyId: params.companyId,
            productVariantId: params.productVariantId,
          },
        },
        data: { quantityReserved: { decrement: reservation.quantity } },
      }),
      tx.stockReservation.update({
        where: { id: reservation.id },
        data: { status: 'consumed' },
      }),
    ]);

    return { movement };
  }

  // Reverte uma saida de venda — cancelamento de venda confirmada ou
  // devolucao com item apto (RN 10.10.15/10.11.4). Nunca mexe no custo
  // medio movel.
  async restoreStock(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productVariantId: string;
      quantity: Prisma.Decimal.Value;
      originId: string;
      createdBy?: string;
    },
  ) {
    const quantity = new Prisma.Decimal(params.quantity);

    const [movement] = await Promise.all([
      tx.stockMovement.create({
        data: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
          type: 'return',
          quantity,
          originType: 'return',
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
          quantityAvailable: quantity,
        },
        update: { quantityAvailable: { increment: quantity } },
      }),
    ]);

    return { movement };
  }

  // Estorno controlado de recebimento: remove a quantidade disponível e
  // reverte o efeito do lote no custo médio atual, sem apagar a entrada.
  async reversePurchaseReceipt(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productVariantId: string;
      quantity: Prisma.Decimal.Value;
      receivedUnitCost: Prisma.Decimal.Value;
      originId: string;
      createdBy?: string;
    },
  ) {
    const [variant, balance] = await Promise.all([
      tx.productVariant.findUniqueOrThrow({
        where: { id: params.productVariantId },
      }),
      tx.stockBalance.findUnique({
        where: {
          companyId_productVariantId: {
            companyId: params.companyId,
            productVariantId: params.productVariantId,
          },
        },
      }),
    ]);
    const available = new Prisma.Decimal(balance?.quantityAvailable ?? 0);
    const reserved = new Prisma.Decimal(balance?.quantityReserved ?? 0);
    const quantity = new Prisma.Decimal(params.quantity);
    if (available.lessThan(quantity))
      throw new AppError(
        'PURCHASE_REVERSAL_STOCK_UNAVAILABLE',
        'Não há estoque disponível suficiente para estornar este recebimento.',
        HttpStatus.CONFLICT,
        'quantity',
        { available: available.toString(), required: quantity.toString() },
      );
    const lastPrice = await tx.productPrice.findFirst({
      where: {
        companyId: params.companyId,
        productId: variant.productId,
        deletedAt: null,
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    const currentPhysical = available.add(reserved);
    const remainingPhysical = currentPhysical.sub(quantity);
    const remainingValue = currentPhysical
      .mul(lastPrice?.costPrice ?? 0)
      .sub(quantity.mul(params.receivedUnitCost));
    const newCost = remainingPhysical.greaterThan(0)
      ? Prisma.Decimal.max(remainingValue.div(remainingPhysical), 0)
      : new Prisma.Decimal(0);
    const movement = await tx.stockMovement.create({
      data: {
        companyId: params.companyId,
        productVariantId: params.productVariantId,
        type: 'out',
        quantity: quantity.negated(),
        unitCost: params.receivedUnitCost,
        originType: 'return',
        originId: params.originId,
        createdBy: params.createdBy,
      },
    });
    await tx.stockBalance.update({
      where: {
        companyId_productVariantId: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
        },
      },
      data: { quantityAvailable: { decrement: quantity } },
    });
    await this.products.appendCostHistory(tx, {
      companyId: params.companyId,
      productId: variant.productId,
      productVariantId: params.productVariantId,
      costPrice: newCost,
      createdBy: params.createdBy,
    });
    return { movement, newCost };
  }

  // Chamado pelo Purchasing dentro da MESMA transacao (TA-ARCH-003) quando
  // uma compra vira "ordered" — RN-STK-018: itens pedidos e nao recebidos
  // aparecem como "em transito", sem compor quantityAvailable nem
  // quantityReserved (e' so' informativo, fora da formula disponivel =
  // fisico - reservado).
  async markInTransit(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productVariantId: string;
      quantity: Prisma.Decimal.Value;
    },
  ) {
    return tx.stockBalance.upsert({
      where: {
        companyId_productVariantId: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
        },
      },
      create: {
        companyId: params.companyId,
        productVariantId: params.productVariantId,
        quantityInTransit: params.quantity,
      },
      update: { quantityInTransit: { increment: params.quantity } },
    });
  }

  // Chamado pelo Purchasing quando uma compra recebe (total ou
  // parcialmente) ou e' cancelada a partir de "ordered" — tira a mesma
  // quantidade de "em transito".
  async clearInTransit(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productVariantId: string;
      quantity: Prisma.Decimal.Value;
    },
  ) {
    return tx.stockBalance.update({
      where: {
        companyId_productVariantId: {
          companyId: params.companyId,
          productVariantId: params.productVariantId,
        },
      },
      data: { quantityInTransit: { decrement: params.quantity } },
    });
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

    const company = await this.prisma.company.findUnique({
      where: { id: tenant.companyId },
      select: { allowNegativeStock: true },
    });
    if (resultingAvailable.isNegative() && !company?.allowNegativeStock) {
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

      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'stock.adjusted',
        entityType: 'stock_adjustment',
        entityId: adjustment.id,
        afterData: {
          productVariantId: dto.productVariantId,
          quantity: delta.toString(),
          requiresApproval,
        },
        reason: dto.reason,
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
      include: {
        adjustment: {
          select: { reason: true, requiresApproval: true, approvedBy: true },
        },
        productVariant: {
          include: { product: true },
        },
      },
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

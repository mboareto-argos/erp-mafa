import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { AuditService } from '../../audit/audit.service';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { InventoryService } from '../inventory.service';
import { KitAssemblyDto, SetKitDto } from './dto/kit.schema';

type Db = Prisma.TransactionClient | PrismaService;

/** Peça congelada por UMA unidade do kit (sale_items.kit_components). */
export type KitComponentSnapshot = {
  productVariantId: string;
  quantity: string;
  unitCost: string;
};

// Custo atual (custo médio móvel) de uma variação: última linha do histórico
// de preço do produto — mesma fonte que a venda usa para congelar o CMV.
export async function currentUnitCost(
  db: Db,
  companyId: string,
  productId: string,
): Promise<Prisma.Decimal> {
  const lastPrice = await db.productPrice.findFirst({
    where: { companyId, productId, deletedAt: null },
    orderBy: { effectiveFrom: 'desc' },
  });
  return new Prisma.Decimal(lastPrice?.costPrice ?? 0);
}

// Composição atual do kit com o custo de cada peça agora (BR §10.3, regra 12:
// custo do kit = soma dos custos das peças no momento).
export async function snapshotKitComponents(
  db: Db,
  companyId: string,
  kitProductId: string,
): Promise<KitComponentSnapshot[]> {
  const components = await db.productKitComponent.findMany({
    where: { companyId, kitProductId, deletedAt: null },
    include: { componentVariant: { select: { productId: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (components.length === 0)
    throw new AppError(
      'KIT_WITHOUT_COMPONENTS',
      'Este kit não tem peças cadastradas.',
      HttpStatus.BAD_REQUEST,
      'components',
    );
  const snapshot: KitComponentSnapshot[] = [];
  for (const component of components) {
    const cost = await currentUnitCost(
      db,
      companyId,
      component.componentVariant.productId,
    );
    snapshot.push({
      productVariantId: component.componentVariantId,
      quantity: component.quantity.toString(),
      unitCost: cost.toString(),
    });
  }
  return snapshot;
}

/** Soma de quantidade x custo das peças: custo de UMA unidade do kit. */
export function kitUnitCost(snapshot: KitComponentSnapshot[]) {
  return snapshot.reduce(
    (sum, component) =>
      sum.add(new Prisma.Decimal(component.quantity).mul(component.unitCost)),
    new Prisma.Decimal(0),
  );
}

export function parseKitSnapshot(value: unknown): KitComponentSnapshot[] {
  return Array.isArray(value) ? (value as KitComponentSnapshot[]) : [];
}

@Injectable()
export class KitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
  ) {}

  // Detalhe do kit para a tela: peças com custo, preço e estoque atuais, e
  // os números que a regra 11 pede (economia vs. peças avulsas).
  async get(companyId: string, productId: string) {
    const product = await this.findProduct(this.prisma, companyId, productId);
    const components = await this.prisma.productKitComponent.findMany({
      where: { companyId, kitProductId: productId, deletedAt: null },
      include: {
        componentVariant: {
          include: {
            product: {
              include: {
                prices: {
                  where: { deletedAt: null },
                  orderBy: { effectiveFrom: 'desc' },
                  take: 1,
                },
              },
            },
            stockBalances: { where: { companyId } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const kitPrice = await this.prisma.productPrice.findFirst({
      where: { companyId, productId, deletedAt: null },
      orderBy: { effectiveFrom: 'desc' },
    });
    const kitVariant = await this.prisma.productVariant.findFirst({
      where: { companyId, productId, deletedAt: null },
      include: { stockBalances: { where: { companyId } } },
    });

    let piecesCost = new Prisma.Decimal(0);
    let piecesPrice = new Prisma.Decimal(0);
    let canAssemble: number | null = null;
    const pieces = components.map((component) => {
      const variant = component.componentVariant;
      const price = variant.product.prices[0];
      const cost = new Prisma.Decimal(price?.costPrice ?? 0);
      const salePrice = new Prisma.Decimal(price?.salePrice ?? 0);
      const available = new Prisma.Decimal(
        variant.stockBalances[0]?.quantityAvailable ?? 0,
      );
      piecesCost = piecesCost.add(cost.mul(component.quantity));
      piecesPrice = piecesPrice.add(salePrice.mul(component.quantity));
      const fits = Math.max(
        0,
        Math.floor(available.div(component.quantity).toNumber()),
      );
      canAssemble = canAssemble === null ? fits : Math.min(canAssemble, fits);
      return {
        productVariantId: variant.id,
        productId: variant.productId,
        name: variant.product.name,
        sku: variant.skuVariant,
        quantity: component.quantity.toString(),
        unitCost: cost.toString(),
        salePrice: salePrice.toString(),
        available: available.toString(),
      };
    });
    const kitSalePrice = new Prisma.Decimal(kitPrice?.salePrice ?? 0);

    return {
      productId,
      mode: product.kitMode,
      components: pieces,
      kitSalePrice: kitSalePrice.toString(),
      kitStock: new Prisma.Decimal(
        kitVariant?.stockBalances[0]?.quantityAvailable ?? 0,
      ).toString(),
      kitUnitCost: new Prisma.Decimal(kitPrice?.costPrice ?? 0).toString(),
      piecesCost: piecesCost.toString(),
      piecesPrice: piecesPrice.toString(),
      savings: Prisma.Decimal.max(piecesPrice.sub(kitSalePrice), 0).toString(),
      canAssemble: canAssemble ?? 0,
    };
  }

  // BR §10.3, regras 11 e 12. Trocar a composição inativa as linhas antigas
  // (nunca apaga) e cria as novas.
  async set(tenant: CurrentTenantContext, productId: string, dto: SetKitDto) {
    const { companyId } = tenant;
    const product = await this.findProduct(this.prisma, companyId, productId);

    // Peças repetidas viram uma linha só (soma das quantidades).
    const merged = new Map<string, Prisma.Decimal>();
    for (const component of dto.components) {
      merged.set(
        component.productVariantId,
        (merged.get(component.productVariantId) ?? new Prisma.Decimal(0)).add(
          component.quantity,
        ),
      );
    }

    if (dto.mode !== null) {
      const variants = await this.prisma.productVariant.findMany({
        where: {
          companyId,
          id: { in: [...merged.keys()] },
          deletedAt: null,
          product: { deletedAt: null, status: 'active' },
        },
        include: { product: { select: { id: true, kitMode: true } } },
      });
      if (variants.length !== merged.size)
        throw new AppError(
          'INVALID_KIT_COMPONENT',
          'Uma ou mais peças não existem ou estão inativas.',
          HttpStatus.BAD_REQUEST,
          'components',
        );
      if (variants.some((variant) => variant.product.id === productId))
        throw new AppError(
          'INVALID_KIT_COMPONENT',
          'O kit não pode ser peça dele mesmo.',
          HttpStatus.BAD_REQUEST,
          'components',
        );
      if (variants.some((variant) => variant.product.kitMode !== null))
        throw new AppError(
          'INVALID_KIT_COMPONENT',
          'Um kit não pode ter outro kit como peça.',
          HttpStatus.BAD_REQUEST,
          'components',
        );
      const usedAsPiece = await this.prisma.productKitComponent.findFirst({
        where: {
          companyId,
          deletedAt: null,
          componentVariant: { productId },
        },
        select: { id: true },
      });
      if (usedAsPiece)
        throw new AppError(
          'INVALID_KIT_COMPONENT',
          'Este produto é peça de outro kit e não pode virar kit.',
          HttpStatus.BAD_REQUEST,
          'mode',
        );
    }

    // Kit pronto em estoque não pode mudar de modo nem deixar de ser kit:
    // os kits montados ficariam órfãos. Desmonte antes.
    if (product.kitMode === 'assembled' && dto.mode !== 'assembled') {
      const balance = await this.kitBalance(this.prisma, companyId, productId);
      if (balance.greaterThan(0))
        throw new AppError(
          'KIT_HAS_STOCK',
          'Desmonte os kits prontos antes de mudar o modo do kit.',
          HttpStatus.CONFLICT,
          'mode',
          { kitStock: balance.toString() },
        );
    }
    // Produto comum com estoque não vira kit "na hora" (o estoque dele
    // deixaria de ser vendido).
    if (product.kitMode === null && dto.mode === 'on_demand') {
      const balance = await this.kitBalance(this.prisma, companyId, productId);
      if (balance.greaterThan(0))
        throw new AppError(
          'KIT_HAS_STOCK',
          'Este produto tem estoque próprio; use o modo "montado antes".',
          HttpStatus.CONFLICT,
          'mode',
          { kitStock: balance.toString() },
        );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productKitComponent.updateMany({
        where: { companyId, kitProductId: productId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (dto.mode !== null) {
        await tx.productKitComponent.createMany({
          data: [...merged.entries()].map(([productVariantId, quantity]) => ({
            companyId,
            kitProductId: productId,
            componentVariantId: productVariantId,
            quantity,
            createdBy: tenant.userId,
          })),
        });
      }
      await tx.product.update({
        where: { id: productId },
        data: { kitMode: dto.mode },
      });
      await this.audit.record(tx, {
        companyId,
        userId: tenant.userId,
        action: 'product.kit_updated',
        entityType: 'product',
        entityId: productId,
        beforeData: { kitMode: product.kitMode },
        afterData: {
          kitMode: dto.mode,
          components: [...merged.entries()].map(([id, quantity]) => ({
            productVariantId: id,
            quantity: quantity.toString(),
          })),
        },
      });
    });

    return this.get(companyId, productId);
  }

  // BR §10.3, regras 12 e 13: baixa as peças (cada uma com o seu custo) e
  // soma N kits ao estoque com custo = soma das peças. Tudo na mesma
  // transação, com movimentações de origem kit_assembly.
  async assemble(
    tenant: CurrentTenantContext,
    productId: string,
    dto: KitAssemblyDto,
  ) {
    const { companyId } = tenant;
    return this.prisma.$transaction(async (tx) => {
      const product = await this.findProduct(tx, companyId, productId);
      this.assertAssembled(product.kitMode);
      const kitVariant = await this.kitVariant(tx, companyId, productId);
      const snapshot = await snapshotKitComponents(tx, companyId, productId);
      const unitCost = kitUnitCost(snapshot);
      const quantity = new Prisma.Decimal(dto.quantity);

      const assembly = await tx.kitAssembly.create({
        data: {
          companyId,
          kitProductId: productId,
          type: 'assemble',
          quantity,
          unitCost,
          createdBy: tenant.userId,
        },
      });
      for (const component of snapshot) {
        await this.inventory.releaseStock(tx, {
          companyId,
          productVariantId: component.productVariantId,
          quantity: quantity.mul(component.quantity),
          unitCost: component.unitCost,
          originType: 'kit_assembly',
          originId: assembly.id,
          createdBy: tenant.userId,
        });
      }
      await this.inventory.receiveGoods(tx, {
        companyId,
        productVariantId: kitVariant.id,
        quantity,
        unitCost,
        originType: 'kit_assembly',
        originId: assembly.id,
        createdBy: tenant.userId,
      });
      await this.audit.record(tx, {
        companyId,
        userId: tenant.userId,
        action: 'kit.assembled',
        entityType: 'kit_assembly',
        entityId: assembly.id,
        afterData: {
          kitProductId: productId,
          quantity: quantity.toString(),
          unitCost: unitCost.toString(),
          components: snapshot,
        },
      });
      return {
        id: assembly.id,
        type: assembly.type,
        quantity: quantity.toString(),
        unitCost: unitCost.toString(),
      };
    });
  }

  // Desfaz N kits prontos: baixa o kit (ao custo atual dele) e devolve as
  // peças da composição atual ao estoque, cada uma ao seu custo atual — o
  // custo médio das peças não muda por isso.
  async disassemble(
    tenant: CurrentTenantContext,
    productId: string,
    dto: KitAssemblyDto,
  ) {
    const { companyId } = tenant;
    return this.prisma.$transaction(async (tx) => {
      const product = await this.findProduct(tx, companyId, productId);
      this.assertAssembled(product.kitMode);
      const kitVariant = await this.kitVariant(tx, companyId, productId);
      const quantity = new Prisma.Decimal(dto.quantity);
      const balance = await this.kitBalance(tx, companyId, productId);
      if (balance.lessThan(quantity))
        throw new AppError(
          'STOCK_INSUFFICIENT',
          'Não há tantos kits prontos para desmontar.',
          HttpStatus.BAD_REQUEST,
          'quantity',
          { available: balance.toString(), requested: quantity.toString() },
        );
      const snapshot = await snapshotKitComponents(tx, companyId, productId);
      const unitCost = await currentUnitCost(tx, companyId, productId);

      const assembly = await tx.kitAssembly.create({
        data: {
          companyId,
          kitProductId: productId,
          type: 'disassemble',
          quantity,
          unitCost,
          createdBy: tenant.userId,
        },
      });
      await this.inventory.releaseStock(tx, {
        companyId,
        productVariantId: kitVariant.id,
        quantity,
        unitCost,
        originType: 'kit_assembly',
        originId: assembly.id,
        createdBy: tenant.userId,
      });
      for (const component of snapshot) {
        await this.inventory.receiveGoods(tx, {
          companyId,
          productVariantId: component.productVariantId,
          quantity: quantity.mul(component.quantity),
          unitCost: component.unitCost,
          originType: 'kit_assembly',
          originId: assembly.id,
          createdBy: tenant.userId,
        });
      }
      await this.audit.record(tx, {
        companyId,
        userId: tenant.userId,
        action: 'kit.disassembled',
        entityType: 'kit_assembly',
        entityId: assembly.id,
        afterData: {
          kitProductId: productId,
          quantity: quantity.toString(),
          unitCost: unitCost.toString(),
          components: snapshot,
        },
      });
      return {
        id: assembly.id,
        type: assembly.type,
        quantity: quantity.toString(),
        unitCost: unitCost.toString(),
      };
    });
  }

  private assertAssembled(mode: string | null) {
    if (mode !== 'assembled')
      throw new AppError(
        'KIT_NOT_ASSEMBLED_MODE',
        'Só kits "montados antes" podem ser montados ou desmontados.',
        HttpStatus.CONFLICT,
        'mode',
      );
  }

  private async findProduct(db: Db, companyId: string, productId: string) {
    const product = await db.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
      select: { id: true, kitMode: true },
    });
    if (!product)
      throw new AppError(
        'PRODUCT_NOT_FOUND',
        'Produto não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    return product;
  }

  private async kitVariant(db: Db, companyId: string, productId: string) {
    return db.productVariant.findFirstOrThrow({
      where: { companyId, productId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async kitBalance(db: Db, companyId: string, productId: string) {
    const balances = await db.stockBalance.findMany({
      where: { companyId, productVariant: { productId } },
    });
    return balances.reduce(
      (sum, balance) =>
        sum.add(balance.quantityAvailable).add(balance.quantityReserved),
      new Prisma.Decimal(0),
    );
  }
}

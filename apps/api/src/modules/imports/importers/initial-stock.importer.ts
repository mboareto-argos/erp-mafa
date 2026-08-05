import { z } from 'zod';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { ProductsService } from '../../catalog/products/products.service';
import { InventoryService } from '../../inventory/inventory.service';
import {
  Importer,
  ImportPersistResult,
  ImportRowValidation,
  ValidRow,
} from '../importer.interface';
import { emptyToUndefined, zodIssuesToRowErrors } from '../zod-row';

export const INITIAL_STOCK_IMPORT_COLUMNS = [
  'sku',
  'quantity',
  'unitCost',
] as const;

const initialStockSchema = z.object({
  sku: z.string().min(1, 'Informe o SKU.'),
  quantity: z.number().positive('Informe uma quantidade maior que zero.'),
  unitCost: z.number().nonnegative('Informe o custo unitário.'),
});

export type InitialStockRowData = z.infer<typeof initialStockSchema> & {
  productId: string;
  productVariantId: string;
};

// RN 10.19.8: estoque inicial deve gerar movimentação — nunca escreve saldo
// direto. Reaproveita appendCostHistory() (mesma peça usada no recebimento
// de compra, §10.3 regras 8-9) para fixar o custo e adjustStock() (Fase 2)
// para lançar a movimentação de entrada — nenhum mecanismo novo.
export class InitialStockImporter implements Importer<InitialStockRowData> {
  entityType = 'initial_stock' as const;
  columns = INITIAL_STOCK_IMPORT_COLUMNS;

  constructor(
    private readonly products: ProductsService,
    private readonly inventory: InventoryService,
    private readonly prisma: PrismaService,
  ) {}

  async validateRow(
    tenant: CurrentTenantContext,
    cells: Record<string, string>,
  ): Promise<ImportRowValidation<InitialStockRowData>> {
    const quantityValue = emptyToUndefined(cells.quantity);
    const unitCostValue = emptyToUndefined(cells.unitCost);
    const result = initialStockSchema.safeParse({
      sku: emptyToUndefined(cells.sku),
      quantity: quantityValue
        ? Number(quantityValue.replace(',', '.'))
        : undefined,
      unitCost: unitCostValue
        ? Number(unitCostValue.replace(',', '.'))
        : undefined,
    });
    if (!result.success) {
      return { errors: zodIssuesToRowErrors(result.error.issues) };
    }

    const product = await this.prisma.product.findFirst({
      where: {
        companyId: tenant.companyId,
        sku: result.data.sku,
        deletedAt: null,
      },
      include: { variants: { select: { id: true }, take: 1 } },
    });
    if (!product || !product.variants[0]) {
      return {
        errors: {
          sku: 'Produto não encontrado. Importe os produtos antes do estoque inicial.',
        },
      };
    }

    return {
      data: {
        ...result.data,
        productId: product.id,
        productVariantId: product.variants[0].id,
      },
    };
  }

  async persistRow(
    tenant: CurrentTenantContext,
    validRow: ValidRow<InitialStockRowData>,
  ): Promise<ImportPersistResult> {
    const { productId, productVariantId, quantity, unitCost } = validRow.data;

    await this.prisma.$transaction(async (tx) => {
      await this.products.appendCostHistory(tx, {
        companyId: tenant.companyId,
        productId,
        productVariantId,
        costPrice: unitCost,
        createdBy: tenant.userId,
      });
    });

    await this.inventory.adjustStock(tenant, {
      productVariantId,
      quantity,
      reason: 'Estoque inicial (importação)',
    });

    return {
      status: 'created',
      resultEntityType: 'stock_movement',
      resultEntityId: productVariantId,
    };
  }

  amountOf(data: InitialStockRowData): number {
    return data.quantity * data.unitCost;
  }
}

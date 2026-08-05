import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { ProductsService } from '../../catalog/products/products.service';
import {
  createProductSchema,
  type CreateProductDto,
} from '../../catalog/products/dto/create-product.schema';
import {
  Importer,
  ImportPersistResult,
  ImportRowValidation,
  ValidRow,
} from '../importer.interface';
import { emptyToUndefined, zodIssuesToRowErrors } from '../zod-row';

export const PRODUCT_IMPORT_COLUMNS = [
  'sku',
  'name',
  'unit',
  'minStock',
  'salePrice',
] as const;

// RN-IMP-001/002 (§34.4): categoria/marca ficam de fora do CSV nesta rodada
// — exigiriam o usuário conhecer o uuid de uma categoria/marca já
// cadastrada; podem ser ajustadas depois pela edição do produto (Fase de
// CRUD já entregue).
export class ProductImporter implements Importer<CreateProductDto> {
  entityType = 'product' as const;
  columns = PRODUCT_IMPORT_COLUMNS;

  constructor(
    private readonly products: ProductsService,
    private readonly prisma: PrismaService,
  ) {}

  async validateRow(
    tenant: CurrentTenantContext,
    cells: Record<string, string>,
  ): Promise<ImportRowValidation<CreateProductDto>> {
    const minStockValue = emptyToUndefined(cells.minStock);
    const salePriceValue = emptyToUndefined(cells.salePrice);
    const result = createProductSchema.safeParse({
      sku: emptyToUndefined(cells.sku),
      name: emptyToUndefined(cells.name),
      unit: emptyToUndefined(cells.unit),
      minStock: minStockValue
        ? Number(minStockValue.replace(',', '.'))
        : undefined,
      salePrice: salePriceValue
        ? Number(salePriceValue.replace(',', '.'))
        : undefined,
    });
    if (!result.success) {
      return { errors: zodIssuesToRowErrors(result.error.issues) };
    }

    const duplicateMatch = await this.findDuplicate(
      tenant.companyId,
      result.data,
    );
    return { data: result.data, duplicateMatch };
  }

  private async findDuplicate(companyId: string, data: CreateProductDto) {
    const bySku = await this.prisma.product.findFirst({
      where: { companyId, sku: data.sku, deletedAt: null },
    });
    if (bySku) {
      return { entityId: bySku.id, entityLabel: bySku.name, matchedBy: 'sku' };
    }
    const byNameOrAlias = await this.prisma.product.findFirst({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { name: { equals: data.name, mode: Prisma.QueryMode.insensitive } },
          { aliases: { has: data.name } },
        ],
      },
    });
    if (byNameOrAlias) {
      return {
        entityId: byNameOrAlias.id,
        entityLabel: byNameOrAlias.name,
        matchedBy: byNameOrAlias.aliases.includes(data.name) ? 'alias' : 'name',
      };
    }
    return undefined;
  }

  async persistRow(
    tenant: CurrentTenantContext,
    validRow: ValidRow<CreateProductDto>,
    duplicateAction?:
      'use_existing' | 'create_new' | 'register_alias' | 'ignore',
  ): Promise<ImportPersistResult> {
    const { data, duplicateMatch } = validRow;

    if (duplicateMatch) {
      if (duplicateAction === 'ignore') {
        return { status: 'skipped', resultEntityType: 'product' };
      }
      if (duplicateAction === 'use_existing') {
        return {
          status: 'skipped',
          resultEntityType: 'product',
          resultEntityId: duplicateMatch.entityId,
        };
      }
      if (duplicateAction === 'register_alias') {
        await this.prisma.product.update({
          where: { id: duplicateMatch.entityId },
          data: { aliases: { push: data.name } },
        });
        return {
          status: 'updated',
          resultEntityType: 'product',
          resultEntityId: duplicateMatch.entityId,
        };
      }
      // duplicateAction === 'create_new' cai no fluxo normal de criação.
    }

    const product = await this.products.create(tenant, data);
    return {
      status: 'created',
      resultEntityType: 'product',
      resultEntityId: product.id,
    };
  }
}

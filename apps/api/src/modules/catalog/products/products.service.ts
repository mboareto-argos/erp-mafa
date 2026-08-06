import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { AuditService } from '../../audit/audit.service';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreateProductDto } from './dto/create-product.schema';
import { UpdateProductDto } from './dto/update-product.schema';
import { RepriceProductDto } from './dto/reprice-product.schema';

const PRODUCT_INCLUDE = {
  category: true,
  brand: true,
  variants: { select: { id: true, skuVariant: true } as const },
  prices: { orderBy: { effectiveFrom: 'desc' as const }, take: 1 },
} satisfies Prisma.ProductInclude;

const PRODUCT_DETAIL_INCLUDE = {
  category: true,
  brand: true,
  variants: { select: { id: true, skuVariant: true } as const },
  prices: {
    where: { deletedAt: null },
    orderBy: { effectiveFrom: 'desc' as const },
  },
} satisfies Prisma.ProductInclude;

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export type ListProductsParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenant: CurrentTenantContext, dto: CreateProductDto) {
    await this.assertBelongsToCompany(
      'category',
      dto.categoryId,
      tenant.companyId,
    );
    await this.assertBelongsToCompany('brand', dto.brandId, tenant.companyId);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            companyId: tenant.companyId,
            sku: dto.sku,
            name: dto.name,
            unit: dto.unit,
            categoryId: dto.categoryId,
            brandId: dto.brandId,
            minStock: dto.minStock,
            createdBy: tenant.userId,
          },
        });

        // Toda variacao referenciavel pelo Inventory futuro precisa de uma
        // ProductVariant (StockBalance nunca aponta pra Product direto) —
        // produtos sem variacao real ganham uma variante "padrao" implicita.
        const variant = await tx.productVariant.create({
          data: {
            companyId: tenant.companyId,
            productId: product.id,
            skuVariant: dto.sku,
            attributes: {},
            createdBy: tenant.userId,
          },
        });

        if (dto.salePrice !== undefined) {
          await tx.productPrice.create({
            data: {
              companyId: tenant.companyId,
              productId: product.id,
              productVariantId: variant.id,
              // DS-FORM-004: custo não é digitado no cadastro. Até existir um
              // recebimento, o custo calculado parte de zero.
              costPrice: 0,
              salePrice: dto.salePrice,
              effectiveFrom: new Date(),
              createdBy: tenant.userId,
            },
          });
        }

        return tx.product.findUniqueOrThrow({
          where: { id: product.id },
          include: {
            variants: true,
            prices: true,
            category: true,
            brand: true,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError(
          'SKU_IN_USE',
          'Já existe um produto com este SKU.',
          HttpStatus.CONFLICT,
          'sku',
        );
      }
      throw error;
    }
  }

  // Retrocompatível: sem `page`, devolve o array completo de sempre (é o
  // que compras/vendas/estoque usam pra preencher seletor de produto — não
  // podem quebrar). Só quando `page` é informado é que a resposta muda de
  // formato para `{ items, total, page, pageSize }`, usado pela tela de
  // listagem/busca de Produtos.
  async list(companyId: string, params: ListProductsParams = {}) {
    const where: Prisma.ProductWhereInput = {
      companyId,
      deletedAt: null,
      ...(params.q
        ? { name: { contains: params.q, mode: 'insensitive' as const } }
        : {}),
    };

    if (!params.page) {
      return this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { name: 'asc' },
      });
    }

    const pageSize = Math.min(
      params.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const page = Math.max(params.page, 1);
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async get(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      include: PRODUCT_DETAIL_INCLUDE,
    });
    if (!product) {
      throw new AppError(
        'PRODUCT_NOT_FOUND',
        'Produto não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
    return product;
  }

  async update(companyId: string, id: string, dto: UpdateProductDto) {
    await this.findOwnedOrThrow(companyId, id);
    if (dto.categoryId) {
      await this.assertBelongsToCompany('category', dto.categoryId, companyId);
    }
    if (dto.brandId) {
      await this.assertBelongsToCompany('brand', dto.brandId, companyId);
    }
    try {
      return await this.prisma.product.update({
        where: { id },
        data: dto,
        include: PRODUCT_INCLUDE,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError(
          'SKU_IN_USE',
          'Já existe um produto com este SKU.',
          HttpStatus.CONFLICT,
          'sku',
        );
      }
      throw error;
    }
  }

  // Nunca apaga — so inativa (RN 10.3.3/10.3.4 do Documento de Negocio).
  async deactivate(companyId: string, id: string) {
    await this.findOwnedOrThrow(companyId, id);
    return this.prisma.product.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  // BR US-PROD-002: o produto poderá ser reativado.
  async reactivate(companyId: string, id: string) {
    await this.findOwnedOrThrow(companyId, id);
    return this.prisma.product.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  // BR §10.3 regras 8-9: o preço mantém histórico; o custo permanece derivado
  // de recebimentos e ajustes autorizados (DS-FORM-004), nunca deste comando.
  async reprice(
    tenant: CurrentTenantContext,
    productId: string,
    dto: RepriceProductDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, companyId: tenant.companyId },
        include: {
          variants: true,
          prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
        },
      });
      if (!product) {
        throw new AppError(
          'PRODUCT_NOT_FOUND',
          'Produto não encontrado.',
          HttpStatus.NOT_FOUND,
        );
      }
      const variant = product.variants[0];
      const previous = product.prices[0];

      const newPrice = await tx.productPrice.create({
        data: {
          companyId: tenant.companyId,
          productId,
          productVariantId: variant.id,
          costPrice: previous?.costPrice ?? 0,
          salePrice: dto.salePrice,
          effectiveFrom: new Date(),
          createdBy: tenant.userId,
        },
      });

      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'product.repriced',
        entityType: 'product',
        entityId: productId,
        beforeData: previous
          ? {
              salePrice: previous.salePrice.toString(),
              costPrice: previous.costPrice.toString(),
            }
          : undefined,
        afterData: {
          salePrice: newPrice.salePrice.toString(),
          costPrice: newPrice.costPrice.toString(),
        },
        reason: dto.reason,
      });

      return tx.product.findUniqueOrThrow({
        where: { id: productId },
        include: PRODUCT_INCLUDE,
      });
    });
  }

  private async findOwnedOrThrow(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });
    if (!product) {
      throw new AppError(
        'PRODUCT_NOT_FOUND',
        'Produto não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }
    return product;
  }

  // Servico publico chamado pelo InventoryService quando uma compra e'
  // recebida (custo medio movel recalculado — RN 11.4 do Documento de
  // Negocio). Nunca edita uma linha existente de ProductPrice — insere uma
  // nova, carregando adiante o ultimo salePrice conhecido (DS-FORM-004:
  // custo e' sempre calculado, nunca digitado depois da criacao do produto).
  // Recebe o `tx` da transacao do chamador para manter atomicidade com o
  // recebimento (TA-ARCH-003) — nunca abre uma transacao própria aqui.
  async appendCostHistory(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productId: string;
      productVariantId: string;
      costPrice: Prisma.Decimal.Value;
      createdBy?: string;
    },
  ) {
    const lastPrice = await tx.productPrice.findFirst({
      where: {
        companyId: params.companyId,
        productId: params.productId,
        deletedAt: null,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return tx.productPrice.create({
      data: {
        companyId: params.companyId,
        productId: params.productId,
        productVariantId: params.productVariantId,
        costPrice: params.costPrice,
        salePrice: lastPrice?.salePrice ?? 0,
        effectiveFrom: new Date(),
        createdBy: params.createdBy,
      },
    });
  }

  private async assertBelongsToCompany(
    entity: 'category' | 'brand',
    id: string | undefined,
    companyId: string,
  ) {
    if (!id) return;
    const found =
      entity === 'category'
        ? await this.prisma.category.findFirst({ where: { id, companyId } })
        : await this.prisma.brand.findFirst({ where: { id, companyId } });
    if (!found) {
      throw new AppError(
        entity === 'category' ? 'INVALID_CATEGORY' : 'INVALID_BRAND',
        entity === 'category' ? 'Categoria inválida.' : 'Marca inválida.',
        HttpStatus.BAD_REQUEST,
        entity === 'category' ? 'categoryId' : 'brandId',
      );
    }
  }
}

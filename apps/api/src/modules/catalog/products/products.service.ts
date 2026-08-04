import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CreateProductDto } from './dto/create-product.schema';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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

        if (dto.referenceCost !== undefined && dto.salePrice !== undefined) {
          await tx.productPrice.create({
            data: {
              companyId: tenant.companyId,
              productId: product.id,
              productVariantId: variant.id,
              costPrice: dto.referenceCost,
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

  list(companyId: string) {
    return this.prisma.product.findMany({
      where: { companyId, deletedAt: null },
      include: {
        category: true,
        brand: true,
        prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Nunca apaga — so inativa (RN 10.3.3/10.3.4 do Documento de Negocio).
  async deactivate(companyId: string, id: string) {
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
    return this.prisma.product.update({
      where: { id },
      data: { status: 'inactive' },
    });
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

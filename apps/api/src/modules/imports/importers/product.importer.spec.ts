import { ProductImporter } from './product.importer';
import { ProductsService } from '../../catalog/products/products.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ProductImporter — validação e casamento de duplicidade (RN-IMP-001/002)', () => {
  const tenant = { companyId: 'company-1', userId: 'user-1' } as never;

  function makeImporter(findFirstResult: unknown) {
    const findFirst = jest.fn().mockResolvedValue(findFirstResult);
    const prisma = { product: { findFirst } } as unknown as PrismaService;
    const importer = new ProductImporter({} as ProductsService, prisma);
    return { importer, findFirst };
  }

  it('rejeita linha sem SKU ou nome', async () => {
    const { importer } = makeImporter(null);
    const result = await importer.validateRow(tenant, {
      sku: '',
      name: '',
      unit: 'un',
    });
    expect(result.data).toBeUndefined();
    expect(result.errors).toHaveProperty('sku');
  });

  it('sem duplicidade, valida a linha e não aponta duplicateMatch', async () => {
    const { importer, findFirst } = makeImporter(null);
    const result = await importer.validateRow(tenant, {
      sku: 'SKU-1',
      name: 'Produto Novo',
      unit: 'un',
    });
    expect(result.errors).toBeUndefined();
    expect(result.duplicateMatch).toBeUndefined();
    expect(findFirst).toHaveBeenCalledTimes(2); // busca por sku, depois por nome/alias
  });

  it('encontra duplicidade por SKU exato', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: 'prod-1', name: 'Produto Existente' });
    const prisma = { product: { findFirst } } as unknown as PrismaService;
    const importer = new ProductImporter({} as ProductsService, prisma);

    const result = await importer.validateRow(tenant, {
      sku: 'SKU-DUP',
      name: 'Outro Nome',
      unit: 'un',
    });
    expect(result.duplicateMatch).toEqual({
      entityId: 'prod-1',
      entityLabel: 'Produto Existente',
      matchedBy: 'sku',
    });
  });

  it('encontra duplicidade por alias quando o nome bate com um alias já cadastrado', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null) // busca por sku: nada
      .mockResolvedValueOnce({
        id: 'prod-2',
        name: 'Nome Oficial',
        aliases: ['Nome Antigo'],
      });
    const prisma = { product: { findFirst } } as unknown as PrismaService;
    const importer = new ProductImporter({} as ProductsService, prisma);

    const result = await importer.validateRow(tenant, {
      sku: 'SKU-2',
      name: 'Nome Antigo',
      unit: 'un',
    });
    expect(result.duplicateMatch).toEqual({
      entityId: 'prod-2',
      entityLabel: 'Nome Oficial',
      matchedBy: 'alias',
    });
  });
});

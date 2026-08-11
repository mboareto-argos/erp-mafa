import { AppIcon } from '@/components/layout/app-icon';
import { NewProductForm } from '@/components/catalog/new-product-form';
import {
  ProductRow,
  type ProductListItem,
} from '@/components/catalog/product-row';
import {
  ListingMetrics,
  ListingPagination,
  ListingSearch,
  ListingTable,
} from '@/components/listings/listing-ui';
import { backendAuthenticatedRequest, getSession } from '@/lib/session';

type PaginatedProducts = {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
};
type CatalogOption = { id: string; name: string; status: string };
type Balance = { quantityAvailable: string; productVariant: { id: string } };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    new?: string;
    edit?: string;
  }>;
}) {
  const { q, page, new: newAction, edit: editId } = await searchParams;
  const currentPage = Number(page ?? '1') || 1;
  const query = new URLSearchParams({ page: String(currentPage) });
  if (q) query.set('q', q);

  const session = (await getSession()) as { permissions: string[] } | null;
  const canManage = session?.permissions.includes('manage_catalog') ?? false;
  const canViewInventory =
    session?.permissions.includes('view_inventory') ?? false;
  const [result, categories, brands, balances] = await Promise.all([
    backendAuthenticatedRequest(
      `/catalog/products?${query.toString()}`,
    ) as Promise<PaginatedProducts>,
    backendAuthenticatedRequest('/catalog/categories') as Promise<
      CatalogOption[]
    >,
    backendAuthenticatedRequest('/catalog/brands') as Promise<CatalogOption[]>,
    canViewInventory
      ? (backendAuthenticatedRequest('/inventory/balances') as Promise<
          Balance[]
        >)
      : Promise.resolve([]),
  ]);
  const availableByVariant = new Map(
    balances.map((balance) => [
      balance.productVariant.id,
      balance.quantityAvailable,
    ]),
  );
  const products = result.items.map((product) => ({
    ...product,
    stockAvailable: canViewInventory
      ? String(
          product.variants.reduce(
            (total, variant) =>
              total + Number(availableByVariant.get(variant.id) ?? 0),
            0,
          ),
        )
      : undefined,
  }));
  const editingProduct = canManage
    ? products.find((product) => product.id === editId)
    : undefined;
  const formOpen = newAction === 'product' || Boolean(editingProduct);

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h1>Produtos</h1>
          <p>
            Cadastre produtos uma vez e use-os em compras, vendas e estoque.
          </p>
        </div>
      </div>

      {canManage && (
        <div className="page-workspace-action">
          <NewProductForm
            key={
              editingProduct
                ? `edit-${editingProduct.id}`
                : newAction === 'product'
                  ? 'new-product'
                  : 'closed-product'
            }
            initialOpen={formOpen}
            categories={categories}
            brands={brands}
            editingProduct={
              editingProduct
                ? {
                    id: editingProduct.id,
                    name: editingProduct.name,
                    sku: editingProduct.sku,
                    unit: editingProduct.unit,
                    minStock: editingProduct.minStock,
                    categoryId: editingProduct.category?.id,
                    brandId: editingProduct.brand?.id,
                  }
                : undefined
            }
          />
        </div>
      )}

      <ListingMetrics
        metrics={[
          {
            label: 'Produtos cadastrados',
            value: result.total,
            detail: 'No catálogo da empresa',
            icon: 'products',
          },
          {
            label: 'Ativos nesta página',
            value: products.filter((product) => product.status === 'active')
              .length,
            detail: 'Disponíveis para operar',
            icon: 'inventory',
          },
          {
            label: 'Com estoque mínimo',
            value: products.filter((product) => product.minStock !== null)
              .length,
            detail: 'Monitorados nesta página',
            icon: 'inventory',
          },
        ]}
      />
      <ListingSearch
        id="product-search"
        label="Buscar produto"
        query={q}
        placeholder="Nome do produto"
      />

      <ListingTable
        headers={
          <>
            <th>Produto</th>
            <th>SKU</th>
            <th>Categoria</th>
            <th className="number">Preço de venda</th>
            <th>Status</th>
            <th className="table-actions-column">Ações</th>
          </>
        }
      >
        {products.length === 0 ? (
          <tr className="table-empty-row">
            <td className="table-empty-cell" colSpan={6}>
              <div className="table-empty-content">
                <span>
                  <AppIcon name="products" />
                </span>
                <strong>
                  {q
                    ? 'Nenhum produto encontrado'
                    : 'Nenhum produto cadastrado ainda'}
                </strong>
                <p>
                  {q
                    ? 'Tente outro termo ou limpe a busca para visualizar todo o catálogo.'
                    : 'Cadastre o primeiro produto para começar a operar compras, vendas e estoque.'}
                </p>
                {q ? (
                  <a
                    className="button button-secondary compact-button"
                    href="/produtos"
                  >
                    Limpar busca
                  </a>
                ) : canManage ? (
                  <a
                    className="button button-primary compact-button"
                    href="?new=product"
                  >
                    Cadastrar primeiro produto
                  </a>
                ) : null}
              </div>
            </td>
          </tr>
        ) : (
          products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              canManage={canManage}
            />
          ))
        )}
      </ListingTable>

      <ListingPagination
        page={result.page}
        total={result.total}
        pageSize={result.pageSize}
        query={q}
      />
    </main>
  );
}

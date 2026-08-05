import { NewProductForm } from "@/components/catalog/new-product-form";
import { ProductRow } from "@/components/catalog/product-row";
import { ListingEmptyState, ListingPagination, ListingSearch, ListingTable } from "@/components/listings/listing-ui";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Product = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  status: "active" | "inactive";
  minStock: string | null;
  category: { name: string } | null;
  prices: Array<{ salePrice: string; costPrice: string }>;
};

type PaginatedProducts = { items: Product[]; total: number; page: number; pageSize: number };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Number(page ?? "1") || 1;
  const query = new URLSearchParams({ page: String(currentPage) });
  if (q) query.set("q", q);

  const [products, session] = await Promise.all([
    backendAuthenticatedRequest(`/catalog/products?${query.toString()}`) as Promise<PaginatedProducts>,
    getSession() as Promise<{ permissions: string[] } | null>,
  ]);
  const canManage = session?.permissions.includes("manage_catalog") ?? false;
  const isEmpty = products.items.length === 0;

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h1>Produtos</h1>
          <p>Cadastre produtos uma vez e use-os em compras e vendas.</p>
        </div>
        {canManage && !isEmpty && <NewProductForm />}
      </div>

      <ListingSearch id="product-search" label="Buscar por nome" query={q} placeholder="Ex.: perfume" />

      {isEmpty ? (
        <ListingEmptyState
          title={q ? "Nenhum produto encontrado" : "Vamos cadastrar seu primeiro produto?"}
          description={q ? "Tente buscar por outro nome." : "Depois você poderá recebê-lo em uma compra para formar o custo e o estoque."}
          action={!q && canManage ? <NewProductForm /> : undefined}
        />
      ) : (
        <ListingTable headers={<><th>Produto</th><th>SKU</th><th>Categoria</th><th className="number">Preço de venda</th><th>Status</th>{canManage && <th>Ações</th>}</>}>
          {products.items.map((product) => <ProductRow key={product.id} product={product} canManage={canManage} />)}
        </ListingTable>
      )}

      <ListingPagination page={products.page} total={products.total} pageSize={products.pageSize} query={q} />
    </main>
  );
}

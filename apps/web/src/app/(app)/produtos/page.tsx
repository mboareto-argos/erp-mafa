import { NewProductForm } from "@/components/catalog/new-product-form";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Product = { id: string; sku: string; name: string; unit: string; status: "active" | "inactive"; minStock: string | null; category: { name: string } | null; prices: Array<{ salePrice: string }> };
const money = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));

export default async function ProductsPage() {
  const [products, session] = await Promise.all([backendAuthenticatedRequest("/catalog/products") as Promise<Product[]>, getSession() as Promise<{ permissions: string[] } | null>]);
  const canManage = session?.permissions.includes("manage_catalog") ?? false;
  return <main className="page-content"><div className="page-heading"><div><h1>Produtos</h1><p>Cadastre produtos uma vez e use-os em compras e vendas.</p></div>{canManage && <NewProductForm />}</div>{products.length === 0 ? <section className="empty-card"><h2>Vamos cadastrar seu primeiro produto?</h2><p>Depois você poderá recebê-lo em uma compra para formar o custo e o estoque.</p></section> : <section className="data-card"><div className="table-wrap"><table><thead><tr><th>Produto</th><th>SKU</th><th>Categoria</th><th className="number">Preço de venda</th><th>Status</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td data-label="Produto"><strong>{product.name}</strong><small className="table-detail">Unidade: {product.unit}</small></td><td data-label="SKU">{product.sku}</td><td data-label="Categoria">{product.category?.name ?? "Sem categoria"}</td><td className="number" data-label="Preço de venda">{product.prices[0] ? money(product.prices[0].salePrice) : "Ainda não informado"}</td><td data-label="Status"><span className={`status-badge ${product.status}`}>{product.status === "active" ? "Ativo" : "Inativo"}</span></td></tr>)}</tbody></table></div></section>}</main>;
}

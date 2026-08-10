import { AppIcon } from "@/components/layout/app-icon";
import { ListingMetrics } from "@/components/listings/listing-ui";
import { QuickSaleForm } from "@/components/sales/quick-sale-form";
import { SaleActions, type SaleListItem } from "@/components/sales/sale-actions";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Product = { id: string; name: string; sku: string; status: string; variants: { id: string }[]; prices: { salePrice: string }[] };
type Method = { id: string; name: string; status: string };
type Customer = { id: string; name: string; status: string };

const money = (value: string | number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const saleStatus: Record<string, string> = { draft: "Rascunho", reserved: "Reservada", confirmed: "Confirmada", cancelled: "Cancelada", partially_returned: "Devolvida parcialmente", returned: "Devolvida" };

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ new?: string; edit?: string }> }) {
  const [sales, products, methods, customers, session] = await Promise.all([
    backendAuthenticatedRequest("/sales") as Promise<SaleListItem[]>,
    backendAuthenticatedRequest("/catalog/products") as Promise<Product[]>,
    backendAuthenticatedRequest("/payments/methods") as Promise<Method[]>,
    backendAuthenticatedRequest("/customers") as Promise<Customer[]>,
    getSession() as Promise<{ permissions: string[] } | null>,
  ]);
  const { new: newAction, edit: editId } = await searchParams;
  const canManage = session?.permissions.includes("manage_sales") ?? false;
  const editingSale = canManage ? sales.find(sale => sale.id === editId && sale.status === "draft") : undefined;
  const confirmed = sales.filter(sale => sale.status === "confirmed");

  return <main className="page-content">
    <div className="page-heading"><div><h1>Vendas</h1><p>Uma venda atualiza estoque, CMV e pagamento em uma única operação.</p></div></div>
    {canManage && products.length > 0 && <div className="page-workspace-action"><QuickSaleForm key={editingSale ? `edit-${editingSale.id}` : newAction === "sale" ? "new-sale" : "closed-sale"} products={products} methods={methods} customers={customers} initialOpen={newAction === "sale" || Boolean(editingSale)} editingSale={editingSale ? { id: editingSale.id, customerId: editingSale.customer?.id, channel: editingSale.channel, discount: editingSale.discount, items: editingSale.items } : undefined} /></div>}
    <ListingMetrics metrics={[{ label: "Vendas cadastradas", value: sales.length, detail: "No histórico disponível", icon: "sales" }, { label: "Confirmadas", value: confirmed.length, detail: "Com estoque e pagamento atualizados", icon: "sales" }, { label: "Valor confirmado", value: money(confirmed.reduce((total, sale) => total + Number(sale.total), 0)), detail: "No histórico disponível", icon: "finance" }]} />
    <section className="data-card"><div className="table-wrap"><table><thead><tr><th>Venda</th><th>Cliente</th><th>Status</th><th className="number">Itens</th><th className="number">Total</th><th className="table-actions-column">Ações</th></tr></thead><tbody>{sales.length === 0 ? <tr className="table-empty-row"><td className="table-empty-cell" colSpan={6}><div className="table-empty-content"><span><AppIcon name="sales" /></span><strong>{products.length === 0 ? "Cadastre um produto antes de fazer uma venda" : "Nenhuma venda registrada ainda"}</strong><p>{products.length === 0 ? "O produto é necessário para validar a disponibilidade e preservar o custo histórico." : "Quando uma venda for criada, ela aparecerá nesta listagem."}</p></div></td></tr> : sales.map(sale => <tr key={sale.id}><td data-label="Venda"><strong>Venda #{sale.id.slice(0, 8)}</strong><span className="table-detail">{dateTime(sale.createdAt)}</span></td><td data-label="Cliente"><strong>{sale.customer?.name ?? "Consumidor final"}</strong></td><td data-label="Status"><span className={`status-badge ${sale.status}`}>{saleStatus[sale.status] ?? sale.status}</span></td><td className="number" data-label="Itens">{sale.items.length}</td><td className="number" data-label="Total">{money(sale.total)}</td><td className="table-actions-cell" data-label="Ações"><SaleActions sale={sale} canManage={canManage} methods={methods} /></td></tr>)}</tbody></table></div></section>
  </main>;
}

import { QuickPurchaseForm } from "@/components/purchasing/quick-purchase-form";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Product = { id: string; name: string; sku: string; variants: Array<{ id: string }> };
type Purchase = { id: string; status: string; currency: string; items: Array<{ id: string; quantity: string; quantityReceived: string }> };
type Supplier = { id: string; name: string; status: string };
const purchaseStatus: Record<string, string> = { draft: "Rascunho", ordered: "Confirmada", partially_received: "Recebida parcialmente", received: "Recebida", cancelled: "Cancelada" };

export default async function PurchasesPage() {
  const [purchases, products, suppliers, session] = await Promise.all([backendAuthenticatedRequest("/purchasing/purchases") as Promise<Purchase[]>, backendAuthenticatedRequest("/catalog/products") as Promise<Product[]>, backendAuthenticatedRequest("/purchasing/suppliers") as Promise<Supplier[]>, getSession() as Promise<{ permissions: string[] } | null>]);
  const canManage = session?.permissions.includes("manage_purchasing") ?? false;
  return <main className="page-content"><div className="page-heading"><div><h1>Compras</h1><p>Registre o recebimento para atualizar estoque e custo.</p></div>{canManage && products.length > 0 && <QuickPurchaseForm products={products} suppliers={suppliers} />}</div>{products.length === 0 ? <section className="empty-card"><h2>Cadastre um produto antes de registrar uma compra</h2><p>O produto é a referência que mantém compra, estoque e vendas conectados.</p></section> : purchases.length === 0 ? <section className="empty-card"><h2>Você ainda não registrou nenhuma compra</h2><p>Use “Comprei mercadorias” para receber produtos e formar o estoque.</p></section> : <section className="data-card"><div className="table-wrap"><table><thead><tr><th>Compra</th><th>Status</th><th className="number">Itens</th><th className="number">Recebido</th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id}><td data-label="Compra"><strong>Compra #{purchase.id.slice(0, 8)}</strong></td><td data-label="Status"><span className={`status-badge ${purchase.status}`}>{purchaseStatus[purchase.status] ?? purchase.status}</span></td><td className="number" data-label="Itens">{purchase.items.length}</td><td className="number" data-label="Recebido">{purchase.items.filter((item) => Number(item.quantityReceived) > 0).length}</td></tr>)}</tbody></table></div></section>}</main>;
}

import { AppIcon } from "@/components/layout/app-icon";
import { ListingMetrics } from "@/components/listings/listing-ui";
import { PurchaseActions, type PurchaseListItem } from "@/components/purchasing/purchase-actions";
import { QuickPurchaseForm } from "@/components/purchasing/quick-purchase-form";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Product = { id: string; name: string; sku: string; status: string; variants: Array<{ id: string }> };
type Supplier = { id: string; name: string; status: string };

const purchaseStatus: Record<string, string> = { draft: "Rascunho", ordered: "Confirmada", partially_received: "Recebida parcialmente", received: "Recebida", cancelled: "Cancelada" };
const money = (value: number, currency = "BRL") => new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const purchaseTotal = (purchase: PurchaseListItem) => purchase.items.reduce((total, item) => total + Number(item.quantity) * Number(item.unitCostOriginCurrency), 0) + purchase.receipts.flatMap(receipt => receipt.costAllocations).reduce((total, allocation) => total + Number(allocation.amount), 0);

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ new?: string; edit?: string }> }) {
  const [purchases, products, suppliers, session] = await Promise.all([
    backendAuthenticatedRequest("/purchasing/purchases") as Promise<PurchaseListItem[]>,
    backendAuthenticatedRequest("/catalog/products") as Promise<Product[]>,
    backendAuthenticatedRequest("/purchasing/suppliers") as Promise<Supplier[]>,
    getSession() as Promise<{ permissions: string[] } | null>,
  ]);
  const canManage = session?.permissions.includes("manage_purchasing") ?? false;
  const { new: newAction, edit: editId } = await searchParams;
  const editingPurchase = canManage ? purchases.find(purchase => purchase.id === editId && purchase.status === "draft") : undefined;
  const received = purchases.filter(purchase => purchase.status === "received");
  const receivedItems = purchases.reduce((total, purchase) => total + purchase.items.filter(item => Number(item.quantityReceived) > 0).length, 0);

  return <main className="page-content">
    <div className="page-heading"><div><h1>Compras</h1><p>Registre o recebimento para atualizar estoque e custo.</p></div></div>
    {canManage && products.length > 0 && <div className="page-workspace-action"><QuickPurchaseForm key={editingPurchase ? `edit-${editingPurchase.id}` : newAction === "purchase" ? "new-purchase" : "closed-purchase"} products={products} suppliers={suppliers} initialOpen={newAction === "purchase" || Boolean(editingPurchase)} editingPurchase={editingPurchase ? { id: editingPurchase.id, supplierId: editingPurchase.supplier?.id, items: editingPurchase.items } : undefined} /></div>}
    <ListingMetrics metrics={[{ label: "Compras cadastradas", value: purchases.length, detail: "No histórico disponível", icon: "purchases" }, { label: "Recebidas", value: received.length, detail: "Com estoque atualizado", icon: "inventory" }, { label: "Itens recebidos", value: receivedItems, detail: "Em todas as compras listadas", icon: "products" }]} />
    <section className="data-card"><div className="table-wrap"><table><thead><tr><th>Compra</th><th>Fornecedor</th><th>Status</th><th className="number">Itens</th><th className="number">Total</th><th className="table-actions-column">Ações</th></tr></thead><tbody>{purchases.length === 0 ? <tr className="table-empty-row"><td className="table-empty-cell" colSpan={6}><div className="table-empty-content"><span><AppIcon name="purchases" /></span><strong>{products.length === 0 ? "Cadastre um produto antes de registrar uma compra" : "Nenhuma compra registrada ainda"}</strong><p>{products.length === 0 ? "O produto é a referência que mantém compras, estoque e vendas conectados." : "Quando uma compra for criada, ela aparecerá nesta listagem."}</p></div></td></tr> : purchases.map(purchase => <tr key={purchase.id}><td data-label="Compra"><strong>Compra #{purchase.id.slice(0, 8)}</strong><span className="table-detail">{dateTime(purchase.createdAt)}</span></td><td data-label="Fornecedor"><strong>{purchase.supplier?.name ?? "Não informado"}</strong></td><td data-label="Status"><span className={`status-badge ${purchase.status}`}>{purchaseStatus[purchase.status] ?? purchase.status}</span></td><td className="number" data-label="Itens">{purchase.items.length}</td><td className="number" data-label="Total">{money(purchaseTotal(purchase), purchase.currency)}</td><td className="table-actions-cell" data-label="Ações"><PurchaseActions purchase={purchase} canManage={canManage} /></td></tr>)}</tbody></table></div></section>
  </main>;
}

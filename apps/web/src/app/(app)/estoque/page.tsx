import { StockAdjustmentForm } from "@/components/inventory/stock-adjustment-form";
import { ListingEmptyState, ListingTable } from "@/components/listings/listing-ui";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Product = { id: string; name: string; sku: string; variants: Array<{ id: string; skuVariant: string | null }> };
type Balance = { id: string; quantityAvailable: string; quantityReserved: string; quantityInTransit: string; productVariant: { id: string; product: { name: string; sku: string } } };
type Movement = { id: string; productVariantId: string; type: "in" | "out" | "adjustment" | "return"; quantity: string; originType: "purchase" | "adjustment" | "return" | "sale"; createdAt: string };
type LowStock = { productId: string; name: string };

const quantity = (value: string) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(Number(value));
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const movementLabel: Record<Movement["type"], string> = { in: "Entrada", out: "Saída", adjustment: "Ajuste", return: "Devolução" };

export default async function InventoryPage() {
  const [balances, lowStock, products, movements, session] = await Promise.all([
    backendAuthenticatedRequest("/inventory/balances") as Promise<Balance[]>,
    backendAuthenticatedRequest("/inventory/low-stock") as Promise<LowStock[]>,
    backendAuthenticatedRequest("/catalog/products") as Promise<Product[]>,
    backendAuthenticatedRequest("/inventory/movements") as Promise<Movement[]>,
    getSession() as Promise<{ permissions: string[] } | null>,
  ]);
  const canAdjust = session?.permissions.includes("adjust_stock") ?? false;
  const names = new Map(products.flatMap((product) => product.variants.map((variant) => [variant.id, `${product.name} · ${variant.skuVariant ?? product.sku}`])));

  return <main className="page-content">
    <div className="page-heading"><div><h1>Estoque</h1><p>A quantidade disponível é calculada pelas movimentações e não pode ser editada diretamente.</p></div>{canAdjust && products.some((product) => product.variants.length > 0) && <StockAdjustmentForm products={products} />}</div>
    {lowStock.length > 0 && <section className="alert-card" aria-label="Alerta de estoque baixo"><strong>{lowStock.length} {lowStock.length === 1 ? "produto precisa" : "produtos precisam"} de atenção</strong><span>O saldo disponível está igual ou abaixo do estoque mínimo.</span></section>}
    {balances.length === 0 ? <ListingEmptyState title="Seu estoque está vazio por enquanto" description="Quando você receber uma compra ou registrar um ajuste autorizado, os produtos aparecerão aqui automaticamente." /> : <ListingTable headers={<><th>Produto</th><th>SKU</th><th className="number">Disponível</th><th className="number">Reservado</th><th className="number">Em trânsito</th></>}>
      {balances.map((balance) => <tr key={balance.id}><td data-label="Produto"><strong>{balance.productVariant.product.name}</strong></td><td data-label="SKU">{balance.productVariant.product.sku}</td><td className="number" data-label="Disponível">{quantity(balance.quantityAvailable)}</td><td className="number" data-label="Reservado">{quantity(balance.quantityReserved)}</td><td className="number" data-label="Em trânsito">{quantity(balance.quantityInTransit)}</td></tr>)}
    </ListingTable>}
    <section className="mt-6"><h2 className="mb-3 text-xl">Movimentações recentes</h2>{movements.length === 0 ? <p className="inline-empty">Ainda não há movimentações registradas.</p> : <ListingTable headers={<><th>Produto</th><th>Tipo</th><th className="number">Quantidade</th><th>Origem</th><th>Data</th></>}>
      {movements.slice(0, 20).map((movement) => <tr key={movement.id}><td data-label="Produto"><strong>{names.get(movement.productVariantId) ?? "Produto"}</strong></td><td data-label="Tipo"><span className={`status-badge ${movement.type === "out" ? "inactive" : "active"}`}>{movementLabel[movement.type]}</span></td><td className="number" data-label="Quantidade">{quantity(movement.quantity)}</td><td data-label="Origem">{movement.originType}</td><td data-label="Data">{dateTime(movement.createdAt)}</td></tr>)}
    </ListingTable>}</section>
  </main>;
}

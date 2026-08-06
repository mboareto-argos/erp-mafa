import { StockAdjustmentForm } from "@/components/inventory/stock-adjustment-form";
import { InventoryRowActions, type InventoryMovement } from "@/components/inventory/inventory-row-actions";
import { AppIcon } from "@/components/layout/app-icon";
import { ListingMetrics, ListingPagination, ListingTable } from "@/components/listings/listing-ui";
import { SelectField } from "@/components/ui/select-field";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";
import { InventoryCountWorkspace, type InventoryCount } from "@/components/inventory/inventory-count-workspace";

type Product = { id: string; name: string; sku: string; unit: string; minStock: string | null; status: "active" | "inactive"; variants: Array<{ id: string; skuVariant: string | null }> };
type Balance = { id: string; productVariantId: string; quantityAvailable: string; quantityReserved: string; quantityInTransit: string; productVariant: { id: string; product: { name: string; sku: string } } };
type LowStock = { productId: string; name: string };
type InventoryState = "healthy" | "low" | "zero";
type InventoryRow = { id: string; productId: string; productVariantId: string; productName: string; sku: string; unit: string; productStatus: Product["status"]; quantityAvailable: string; quantityReserved: string; quantityInTransit: string; stockState: InventoryState };

const quantity = (value: string | number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(Number(value));
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const movementLabel: Record<InventoryMovement["type"], string> = { in: "Entrada", out: "Saída", adjustment: "Ajuste", return: "Devolução" };
const originLabel: Record<InventoryMovement["originType"], string> = { purchase: "Compra", adjustment: "Ajuste manual", return: "Devolução", sale: "Venda" };
const stateLabel: Record<InventoryState, string> = { healthy: "Regular", low: "Estoque baixo", zero: "Sem estoque" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ new?: string; variant?: string; q?: string; status?: string; page?: string; inventory?: string }> }) {
  const [balances, lowStock, products, movements, session, counts] = await Promise.all([
    backendAuthenticatedRequest("/inventory/balances") as Promise<Balance[]>,
    backendAuthenticatedRequest("/inventory/low-stock") as Promise<LowStock[]>,
    backendAuthenticatedRequest("/catalog/products") as Promise<Product[]>,
    backendAuthenticatedRequest("/inventory/movements") as Promise<InventoryMovement[]>,
    getSession() as Promise<{ permissions: string[] } | null>,
    backendAuthenticatedRequest("/inventory/counts") as Promise<InventoryCount[]>,
  ]);
  const canAdjust = session?.permissions.includes("adjust_stock") ?? false;
  const { new: newAction, variant: initialVariantId, q, status, page, inventory } = await searchParams;
  const balanceByVariant = new Map(balances.map(balance => [balance.productVariantId, balance]));
  const lowStockIds = new Set(lowStock.map(item => item.productId));
  const allRows: InventoryRow[] = products.flatMap(product => product.variants.map(variant => {
    const balance = balanceByVariant.get(variant.id);
    const available = balance?.quantityAvailable ?? "0";
    const stockState: InventoryState = Number(available) <= 0 ? "zero" : lowStockIds.has(product.id) ? "low" : "healthy";
    return { id: balance?.id ?? `empty-${variant.id}`, productId: product.id, productVariantId: variant.id, productName: product.name, sku: variant.skuVariant ?? product.sku, unit: product.unit, productStatus: product.status, quantityAvailable: available, quantityReserved: balance?.quantityReserved ?? "0", quantityInTransit: balance?.quantityInTransit ?? "0", stockState };
  }));
  const normalizedQuery = q?.trim().toLocaleLowerCase("pt-BR");
  const filteredRows = allRows.filter(row => (!normalizedQuery || row.productName.toLocaleLowerCase("pt-BR").includes(normalizedQuery) || row.sku.toLocaleLowerCase("pt-BR").includes(normalizedQuery)) && (!status || status === "all" || row.stockState === status));
  const pageSize = 20;
  const currentPage = Math.max(Number(page ?? "1") || 1, 1);
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const movementsByVariant = new Map<string, InventoryMovement[]>();
  movements.forEach(movement => movementsByVariant.set(movement.productVariantId, [...(movementsByVariant.get(movement.productVariantId) ?? []), movement]));
  const formOpen = canAdjust && newAction === "adjustment";

  const activeCount = counts.find(count => count.id === inventory);
  return <main className="page-content"><div className="page-heading"><div><h1>Estoque</h1><p>Consulte saldos e movimentações. Toda correção gera um registro auditável.</p></div></div>
    {activeCount ? <InventoryCountWorkspace counts={counts} active={activeCount} canAdjust={canAdjust} /> : <><div className="page-workspace-action inventory-page-actions">{canAdjust && products.some(product => product.variants.length > 0) && <StockAdjustmentForm products={products} balances={balances} initialOpen={formOpen} initialVariantId={initialVariantId} />}<InventoryCountWorkspace counts={counts} canAdjust={canAdjust} /></div>
    <ListingMetrics metrics={[{ label: "Variações controladas", value: allRows.length, detail: "Com posição individual de estoque", icon: "inventory" }, { label: "Produtos em estoque baixo", value: lowStock.length, detail: "Abaixo ou igual ao mínimo", icon: "inventory" }, { label: "Sem estoque", value: allRows.filter(row => row.stockState === "zero").length, detail: "Variações com saldo zerado", icon: "products" }]} />
    {lowStock.length > 0 && <section className="alert-card inventory-alert" aria-label="Alerta de estoque baixo"><span className="inventory-alert-icon"><AppIcon name="inventory" /></span><div><strong>{lowStock.length} {lowStock.length === 1 ? "produto precisa" : "produtos precisam"} de atenção</strong><span>O saldo disponível está igual ou abaixo do estoque mínimo definido no catálogo.</span></div></section>}
    <form method="GET" className="listing-search inventory-filters"><div className="field"><label htmlFor="inventory-search">Buscar produto ou SKU</label><input id="inventory-search" name="q" defaultValue={q} placeholder="Ex.: perfume ou SKU-001" /></div><SelectField label="Situação" name="status" defaultValue={status ?? "all"}><option value="all">Todas</option><option value="healthy">Regular</option><option value="low">Estoque baixo</option><option value="zero">Sem estoque</option></SelectField><button className="button button-secondary compact-button" type="submit"><AppIcon name="search" />Filtrar</button></form>
    <ListingTable headers={<><th>Produto</th><th>SKU</th><th>Situação</th><th className="number">Disponível</th><th className="number">Reservado</th><th className="number">Em trânsito</th><th className="table-actions-column">Ações</th></>}>{visibleRows.length === 0 ? <tr className="table-empty-row"><td className="table-empty-cell" colSpan={7}><div className="table-empty-content"><span><AppIcon name="inventory" /></span><strong>{q || (status && status !== "all") ? "Nenhum saldo encontrado" : "Nenhum produto disponível para controle"}</strong><p>{q || (status && status !== "all") ? "Altere os filtros ou limpe a busca para visualizar outras posições de estoque." : "Cadastre um produto para começar. O saldo será formado por compras, vendas e ajustes autorizados."}</p>{q || (status && status !== "all") ? <a className="button button-secondary compact-button" href="/estoque">Limpar filtros</a> : null}</div></td></tr> : visibleRows.map(row => <tr key={row.id}><td data-label="Produto"><strong>{row.productName}</strong>{row.productStatus === "inactive" && <small className="table-detail">Produto inativo</small>}</td><td data-label="SKU">{row.sku}</td><td data-label="Situação"><span className={`inventory-state-badge ${row.stockState}`}>{stateLabel[row.stockState]}</span></td><td className="number" data-label="Disponível"><strong>{quantity(row.quantityAvailable)}</strong> {row.unit}</td><td className="number" data-label="Reservado">{quantity(row.quantityReserved)} {row.unit}</td><td className="number" data-label="Em trânsito">{quantity(row.quantityInTransit)} {row.unit}</td><td className="table-actions-cell" data-label="Ações"><InventoryRowActions row={row} movements={movementsByVariant.get(row.productVariantId) ?? []} canAdjust={canAdjust} /></td></tr>)}</ListingTable>
    <ListingPagination page={currentPage} total={filteredRows.length} pageSize={pageSize} query={q} extraParams={{ status }} />
    <section className="content-section inventory-movements"><div className="content-section-heading"><div><h2>Movimentações recentes</h2><p>Entradas, saídas, devoluções e ajustes que alteraram os saldos.</p></div></div><ListingTable headers={<><th>Produto</th><th>Tipo</th><th className="number">Quantidade</th><th>Origem</th><th>Motivo</th><th>Data</th></>}>{movements.length === 0 ? <tr className="table-empty-row"><td className="table-empty-cell" colSpan={6}><div className="table-empty-content"><span><AppIcon name="inventory" /></span><strong>Nenhuma movimentação registrada ainda</strong><p>Recebimentos de compras, vendas e ajustes aparecerão automaticamente neste histórico.</p></div></td></tr> : movements.slice(0, 20).map(movement => <tr key={movement.id}><td data-label="Produto"><strong>{movement.productVariant?.product.name ?? "Produto"}</strong><small className="table-detail">{movement.productVariant?.skuVariant ?? movement.productVariant?.product.sku}</small></td><td data-label="Tipo"><span className={`movement-type ${Number(movement.quantity) < 0 ? "negative" : "positive"}`}>{movementLabel[movement.type]}</span></td><td className={`number movement-quantity ${Number(movement.quantity) < 0 ? "negative" : "positive"}`} data-label="Quantidade">{Number(movement.quantity) > 0 ? "+" : ""}{quantity(movement.quantity)}</td><td data-label="Origem">{originLabel[movement.originType]}</td><td data-label="Motivo">{movement.adjustment?.reason ?? "—"}</td><td data-label="Data">{dateTime(movement.createdAt)}</td></tr>)}</ListingTable></section></>}
  </main>;
}

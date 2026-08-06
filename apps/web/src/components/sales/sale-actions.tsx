"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppIcon } from "@/components/layout/app-icon";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type SaleListItem = {
  id: string;
  status: string;
  channel: string;
  subtotal: string;
  discount: string;
  total: string;
  cmvCalculated: string | null;
  grossProfitCalculated: string | null;
  createdAt: string;
  customer: { id: string; name: string } | null;
  items: Array<{
    id: string;
    productVariantId: string;
    quantity: string;
    quantityReturned: string;
    unitPrice: string;
    discount: string;
    productVariant?: { skuVariant: string | null; product: { name: string; sku: string } };
  }>;
  payments: Array<{ id: string; amount: string; feeAmount: string; netAmount: string; paymentMethod: { name: string } }>;
  receivables: Array<{ id: string; description: string; amountOriginal: string; amountReceived: string; dueDate: string; status: string; installmentNumber: number | null; installmentCount: number | null }>;
};

const money = (value: string | number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const statusLabels: Record<string, string> = { draft: "Rascunho", confirmed: "Confirmada", cancelled: "Cancelada", partially_returned: "Devolvida parcialmente", returned: "Devolvida" };
const channelLabels: Record<string, string> = { presencial: "Presencial", whatsapp: "WhatsApp", instagram: "Instagram", catalogo: "Catálogo", outro: "Outro" };

function SaleDetails({ sale, open, onOpenChange }: { sale: SaleListItem; open: boolean; onOpenChange: (open: boolean) => void }) {
  const units = sale.items.reduce((total, item) => total + Number(item.quantity), 0);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sale-detail-dialog">
    <header className="sale-detail-header">
      <div className="sale-detail-title"><span className="sale-detail-icon"><AppIcon name="sales" /></span><div><span className="sale-detail-eyebrow">Detalhes da venda</span><DialogTitle>Venda #{sale.id.slice(0, 8)}</DialogTitle><DialogDescription>Registrada em {dateTime(sale.createdAt)}</DialogDescription></div></div>
      <div className="sale-detail-header-actions"><span className={`status-badge ${sale.status}`}>{statusLabels[sale.status] ?? sale.status}</span><DialogClose className="dialog-close" aria-label="Fechar">×</DialogClose></div>
    </header>

    <div className="sale-detail-layout">
      <div className="sale-detail-main">
        <section className="sale-detail-card sale-detail-overview"><div><span>Cliente</span><strong>{sale.customer?.name ?? "Consumidor final"}</strong></div><div><span>Canal de venda</span><strong>{channelLabels[sale.channel] ?? sale.channel}</strong></div><div><span>Quantidade</span><strong>{sale.items.length} {sale.items.length === 1 ? "item" : "itens"} · {units} un.</strong></div></section>

        <section className="sale-detail-card sale-detail-section"><div className="sale-detail-section-heading"><div><span className="sale-detail-section-icon"><AppIcon name="products" /></span><div><h3>Itens da venda</h3><p>Produtos e valores registrados nesta operação.</p></div></div><strong>{sale.items.length}</strong></div><div className="table-wrap"><table><thead><tr><th>Produto</th><th className="number">Qtd.</th><th className="number">Preço unit.</th><th className="number">Total</th></tr></thead><tbody>{sale.items.map(item => <tr key={item.id}><td data-label="Produto"><strong>{item.productVariant?.product.name ?? "Produto"}</strong><span className="table-detail">SKU: {item.productVariant?.skuVariant || item.productVariant?.product.sku || "—"}</span></td><td className="number" data-label="Quantidade">{item.quantity}</td><td className="number" data-label="Preço unitário">{money(item.unitPrice)}</td><td className="number" data-label="Total">{money(Number(item.quantity) * Number(item.unitPrice) - Number(item.discount))}</td></tr>)}</tbody></table></div></section>

        <section className="sale-detail-card sale-detail-section"><div className="sale-detail-section-heading"><div><span className="sale-detail-section-icon payment"><AppIcon name="finance" /></span><div><h3>Pagamento</h3><p>Valores recebidos na hora e agenda de parcelas.</p></div></div></div>{sale.payments.length === 0 && sale.receivables.length === 0 ? <div className="sale-detail-empty"><span>!</span><p>Pagamento ainda não registrado. Este rascunho precisa ser concluído.</p></div> : <dl className="sale-payment-list">{sale.payments.map(payment => <div key={payment.id}><dt><strong>{payment.paymentMethod.name}</strong><small>{Number(payment.feeAmount) > 0 ? `Taxa: ${money(payment.feeAmount)}` : "Recebido na confirmação"}</small></dt><dd>{money(payment.amount)}</dd></div>)}{sale.receivables.map(receivable => <div key={receivable.id}><dt><strong>Parcela {receivable.installmentNumber}/{receivable.installmentCount}</strong><small>Vence em {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(receivable.dueDate))} · {receivable.status === "received" ? "recebida" : receivable.status === "cancelled" ? "cancelada" : "em aberto"}</small></dt><dd>{money(receivable.amountOriginal)}</dd></div>)}</dl>}</section>
      </div>

      <aside className="sale-financial-summary"><div className="sale-financial-heading"><span>Resumo financeiro</span><p>Valores consolidados da venda.</p></div><dl><div><dt>Subtotal dos itens</dt><dd>{money(sale.subtotal)}</dd></div><div className="discount"><dt>Desconto</dt><dd>- {money(sale.discount)}</dd></div></dl><div className="sale-financial-total"><span>Total da venda</span><strong>{money(sale.total)}</strong></div><div className={`sale-detail-state ${sale.status}`}><AppIcon name={sale.status === "cancelled" ? "cancel" : "shield"} /><p>{sale.status === "draft" ? "Rascunho sem movimentação de estoque ou caixa." : sale.status === "cancelled" ? "Venda cancelada; histórico e estornos preservados." : "Venda registrada no histórico operacional."}</p></div></aside>
    </div>
  </DialogContent></Dialog>;
}

function CancelSale({ saleId, open, onOpenChange }: { saleId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function cancel() {
    setPending(true); setError(undefined);
    try {
      const response = await fetch(`/api/sales/${saleId}/cancel`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cancelar a venda.");
      onOpenChange(false); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível cancelar a venda.");
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><div className="dialog-heading"><div><DialogTitle>Cancelar venda?</DialogTitle><DialogDescription>O registro continuará no histórico. Estoque e movimentação financeira serão estornados quando aplicável.</DialogDescription></div><DialogClose className="dialog-close" aria-label="Fechar">×</DialogClose></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><DialogClose asChild><button className="button button-secondary" type="button">Voltar</button></DialogClose><button className="button button-danger" type="button" onClick={cancel} disabled={pending}>{pending ? "Cancelando…" : "Confirmar cancelamento"}</button></div></DialogContent></Dialog>;
}

function ReturnSale({ sale, open, onOpenChange }: { sale: SaleListItem; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState<string>(); const [reason, setReason] = useState("");
  const available = sale.items.filter(item => Number(item.quantity) > Number(item.quantityReturned));
  const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(available.map(item => [item.id, "0"]))); const [conditions, setConditions] = useState<Record<string, "apt" | "damaged">>(() => Object.fromEntries(available.map(item => [item.id, "apt"])));
  async function submit(event: React.FormEvent) { event.preventDefault(); const items = available.map(item => ({ saleItemId: item.id, quantity: Number(quantities[item.id] || 0), condition: conditions[item.id] })).filter(item => item.quantity > 0); if (!items.length) return setError("Informe ao menos um item devolvido."); setPending(true); setError(undefined); try { const response = await fetch(`/api/sales/${sale.id}/return`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ reason, items }) }); const result = await response.json() as { message?: string }; if (!response.ok) throw new Error(result.message ?? "Não foi possível registrar a devolução."); onOpenChange(false); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar a devolução."); } finally { setPending(false); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><div className="dialog-heading"><div><DialogTitle>Registrar devolução</DialogTitle><DialogDescription>Informe os itens e a condição. Produtos aptos voltam ao estoque; avariados ficam apenas no histórico.</DialogDescription></div><DialogClose className="dialog-close" aria-label="Fechar">×</DialogClose></div><form className="dialog-form" onSubmit={submit}><div className="return-items">{available.map(item => <div key={item.id}><div><strong>{item.productVariant?.product.name ?? "Produto"}</strong><small>Disponível para devolver: {Number(item.quantity) - Number(item.quantityReturned)}</small></div><div className="field"><label htmlFor={`return-${item.id}`}>Quantidade</label><input id={`return-${item.id}`} type="number" min="0" max={Number(item.quantity) - Number(item.quantityReturned)} step="0.001" value={quantities[item.id]} onChange={event => setQuantities(current => ({ ...current, [item.id]: event.target.value }))} /></div><div className="field"><label htmlFor={`condition-${item.id}`}>Condição</label><select id={`condition-${item.id}`} value={conditions[item.id]} onChange={event => setConditions(current => ({ ...current, [item.id]: event.target.value as "apt" | "damaged" }))}><option value="apt">Apto para voltar ao estoque</option><option value="damaged">Avariado</option></select></div></div>)}</div><div className="field"><label htmlFor="return-reason">Motivo</label><textarea id="return-reason" value={reason} onChange={event => setReason(event.target.value)} required maxLength={500} /></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><DialogClose asChild><button className="button button-secondary" type="button">Cancelar</button></DialogClose><button className="button button-primary" disabled={pending}>{pending ? "Registrando…" : "Confirmar devolução"}</button></div></form></DialogContent></Dialog>;
}

export function SaleActions({ sale, canManage }: { sale: SaleListItem; canManage: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const canEdit = canManage && sale.status === "draft";
  const canCancel = canManage && ["draft", "confirmed"].includes(sale.status);
  const canReturn = canManage && ["confirmed", "partially_returned"].includes(sale.status);

  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><button className="row-menu-trigger" type="button" aria-label={`Ações da venda ${sale.id.slice(0, 8)}`}><AppIcon name="more" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" sideOffset={6}>
      <DropdownMenuItem className="dropdown-item view" onSelect={() => setDetailsOpen(true)}><span><AppIcon name="eye" /></span><div><strong>Visualizar</strong><small>Ver resumo completo</small></div></DropdownMenuItem>
      {canEdit && <DropdownMenuItem asChild><Link className="dropdown-item edit" href={`/vendas?edit=${sale.id}`}><span><AppIcon name="edit" /></span><div><strong>Editar rascunho</strong><small>Revisar antes de concluir</small></div></Link></DropdownMenuItem>}
      {canReturn && <DropdownMenuItem className="dropdown-item success" onSelect={() => setReturnOpen(true)}><span><AppIcon name="inventory" /></span><div><strong>Registrar devolução</strong><small>Selecionar itens e condição</small></div></DropdownMenuItem>}
      {canCancel && <DropdownMenuItem className="dropdown-item danger" onSelect={() => setCancelOpen(true)}><span><AppIcon name="cancel" /></span><div><strong>Cancelar venda</strong><small>Preservar histórico e estornar</small></div></DropdownMenuItem>}
    </DropdownMenuContent></DropdownMenu>
    <SaleDetails sale={sale} open={detailsOpen} onOpenChange={setDetailsOpen} />
    {canCancel && <CancelSale saleId={sale.id} open={cancelOpen} onOpenChange={setCancelOpen} />}
    {canReturn && <ReturnSale sale={sale} open={returnOpen} onOpenChange={setReturnOpen} />}
  </>;
}

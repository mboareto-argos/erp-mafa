"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppIcon } from "@/components/layout/app-icon";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type PurchaseListItem = {
  id: string;
  status: string;
  currency: string;
  exchangeRate: string | null;
  createdAt: string;
  supplier: { id: string; name: string } | null;
  items: Array<{
    id: string;
    productVariantId: string;
    quantity: string;
    quantityReceived: string;
    unitCostOriginCurrency: string;
    productVariant?: { skuVariant: string | null; product: { name: string; sku: string } };
  }>;
  receipts: Array<{
    id: string;
    receivedAt: string;
    items: Array<{ id: string; quantityReceived: string; unitCostFinal: string }>;
    costAllocations: Array<{ id: string; type: string; amount: string }>;
  }>;
};

const money = (value: string | number, currency = "BRL") => new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(value));
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const statusLabels: Record<string, string> = { draft: "Rascunho", ordered: "Confirmada", partially_received: "Recebida parcialmente", received: "Recebida", cancelled: "Cancelada" };

const purchaseMerchandiseTotal = (purchase: PurchaseListItem) => purchase.items.reduce((total, item) => total + Number(item.quantity) * Number(item.unitCostOriginCurrency), 0);

function PurchaseDetails({ purchase, open, onOpenChange }: { purchase: PurchaseListItem; open: boolean; onOpenChange: (open: boolean) => void }) {
  const orderedUnits = purchase.items.reduce((total, item) => total + Number(item.quantity), 0);
  const receivedUnits = purchase.items.reduce((total, item) => total + Number(item.quantityReceived), 0);
  const merchandiseTotal = purchaseMerchandiseTotal(purchase);
  const additionalCosts = purchase.receipts.flatMap(receipt => receipt.costAllocations).reduce((total, allocation) => total + Number(allocation.amount), 0);

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sale-detail-dialog">
    <header className="sale-detail-header">
      <div className="sale-detail-title"><span className="sale-detail-icon"><AppIcon name="purchases" /></span><div><span className="sale-detail-eyebrow">Detalhes da compra</span><DialogTitle>Compra #{purchase.id.slice(0, 8)}</DialogTitle><DialogDescription>Registrada em {dateTime(purchase.createdAt)}</DialogDescription></div></div>
      <div className="sale-detail-header-actions"><span className={`status-badge ${purchase.status}`}>{statusLabels[purchase.status] ?? purchase.status}</span><DialogClose className="dialog-close" aria-label="Fechar">×</DialogClose></div>
    </header>

    <div className="sale-detail-layout">
      <div className="sale-detail-main">
        <section className="sale-detail-card sale-detail-overview"><div><span>Fornecedor</span><strong>{purchase.supplier?.name ?? "Não informado"}</strong></div><div><span>Moeda</span><strong>{purchase.currency}</strong></div><div><span>Quantidade</span><strong>{purchase.items.length} {purchase.items.length === 1 ? "item" : "itens"} · {orderedUnits} un.</strong></div></section>

        <section className="sale-detail-card sale-detail-section"><div className="sale-detail-section-heading"><div><span className="sale-detail-section-icon"><AppIcon name="products" /></span><div><h3>Itens da compra</h3><p>Quantidades pedidas, recebidas e custos informados.</p></div></div><strong>{purchase.items.length}</strong></div><div className="table-wrap"><table><thead><tr><th>Produto</th><th className="number">Pedido</th><th className="number">Recebido</th><th className="number">Custo unit.</th><th className="number">Subtotal</th></tr></thead><tbody>{purchase.items.map(item => <tr key={item.id}><td data-label="Produto"><strong>{item.productVariant?.product.name ?? "Produto"}</strong><span className="table-detail">SKU: {item.productVariant?.skuVariant || item.productVariant?.product.sku || "—"}</span></td><td className="number" data-label="Pedido">{item.quantity}</td><td className="number" data-label="Recebido">{item.quantityReceived}</td><td className="number" data-label="Custo unitário">{money(item.unitCostOriginCurrency, purchase.currency)}</td><td className="number" data-label="Subtotal">{money(Number(item.quantity) * Number(item.unitCostOriginCurrency), purchase.currency)}</td></tr>)}</tbody></table></div></section>

        <section className="sale-detail-card sale-detail-section"><div className="sale-detail-section-heading"><div><span className="sale-detail-section-icon payment"><AppIcon name="inventory" /></span><div><h3>Recebimentos</h3><p>Entradas que efetivamente atualizaram estoque e custo.</p></div></div><strong>{purchase.receipts.length}</strong></div>{purchase.receipts.length === 0 ? <div className="sale-detail-empty"><span>!</span><p>Nenhum recebimento registrado. Esta compra ainda não alterou o estoque.</p></div> : <dl className="sale-payment-list">{purchase.receipts.map((receipt, index) => <div key={receipt.id}><dt><strong>Recebimento {index + 1}</strong><small>{dateTime(receipt.receivedAt)} · {receipt.items.reduce((total, item) => total + Number(item.quantityReceived), 0)} un.</small></dt><dd>{money(receipt.items.reduce((total, item) => total + Number(item.quantityReceived) * Number(item.unitCostFinal), 0))}</dd></div>)}</dl>}</section>
      </div>

      <aside className="sale-financial-summary"><div className="sale-financial-heading"><span>Resumo da compra</span><p>Valores informados e custos já rateados.</p></div><dl><div><dt>Mercadorias</dt><dd>{money(merchandiseTotal, purchase.currency)}</dd></div><div><dt>Custos adicionais</dt><dd>{money(additionalCosts)}</dd></div><div><dt>Unidades recebidas</dt><dd>{receivedUnits} de {orderedUnits}</dd></div></dl><div className="sale-financial-total"><span>Total estimado</span><strong>{money(merchandiseTotal + additionalCosts, purchase.currency)}</strong></div><div className={`sale-detail-state ${purchase.status}`}><AppIcon name={purchase.status === "cancelled" ? "cancel" : "shield"} /><p>{purchase.status === "draft" ? "Rascunho sem movimentação de estoque." : purchase.status === "cancelled" ? "Compra cancelada; o histórico foi preservado." : purchase.status === "ordered" ? "Pedido confirmado, ainda sem entrada de estoque." : "Os recebimentos ficam preservados no histórico de estoque e custo."}</p></div></aside>
    </div>
  </DialogContent></Dialog>;
}

function CancelPurchase({ purchaseId, open, onOpenChange }: { purchaseId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function cancel() {
    setPending(true); setError(undefined);
    try {
      const response = await fetch(`/api/purchasing/purchases/${purchaseId}/cancel`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cancelar a compra.");
      onOpenChange(false); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível cancelar a compra.");
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><div className="dialog-heading"><div><DialogTitle>Cancelar compra?</DialogTitle><DialogDescription>O registro continuará no histórico. Esta ação só está disponível antes de qualquer recebimento de estoque.</DialogDescription></div><DialogClose className="dialog-close" aria-label="Fechar">×</DialogClose></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><DialogClose asChild><button className="button button-secondary" type="button">Voltar</button></DialogClose><button className="button button-danger" type="button" onClick={cancel} disabled={pending}>{pending ? "Cancelando…" : "Confirmar cancelamento"}</button></div></DialogContent></Dialog>;
}

export function PurchaseActions({ purchase, canManage }: { purchase: PurchaseListItem; canManage: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const canEdit = canManage && purchase.status === "draft";
  const canCancel = canManage && ["draft", "ordered"].includes(purchase.status);

  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><button className="row-menu-trigger" type="button" aria-label={`Ações da compra ${purchase.id.slice(0, 8)}`}><AppIcon name="more" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" sideOffset={6}>
      <DropdownMenuItem className="dropdown-item view" onSelect={() => setDetailsOpen(true)}><span><AppIcon name="eye" /></span><div><strong>Visualizar</strong><small>Ver resumo completo</small></div></DropdownMenuItem>
      {canEdit && <DropdownMenuItem asChild><Link className="dropdown-item edit" href={`/compras?edit=${purchase.id}`}><span><AppIcon name="edit" /></span><div><strong>Editar rascunho</strong><small>Revisar antes de receber</small></div></Link></DropdownMenuItem>}
      {canCancel && <DropdownMenuItem className="dropdown-item danger" onSelect={() => setCancelOpen(true)}><span><AppIcon name="cancel" /></span><div><strong>Cancelar compra</strong><small>Preservar o histórico</small></div></DropdownMenuItem>}
    </DropdownMenuContent></DropdownMenu>
    <PurchaseDetails purchase={purchase} open={detailsOpen} onOpenChange={setDetailsOpen} />
    {canCancel && <CancelPurchase purchaseId={purchase.id} open={cancelOpen} onOpenChange={setCancelOpen} />}
  </>;
}

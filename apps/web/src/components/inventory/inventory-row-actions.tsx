"use client";

import Link from "next/link";
import { useState } from "react";
import { AppIcon } from "@/components/layout/app-icon";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type InventoryMovement = {
  id: string;
  productVariantId: string;
  type: "in" | "out" | "adjustment" | "return";
  quantity: string;
  originType: "purchase" | "adjustment" | "return" | "sale";
  createdAt: string;
  adjustment: { reason: string; requiresApproval: boolean; approvedBy: string | null } | null;
  productVariant?: { skuVariant: string | null; product: { name: string; sku: string } };
};

type InventoryRow = {
  productVariantId: string;
  productName: string;
  sku: string;
  unit: string;
  quantityAvailable: string;
  quantityReserved: string;
  quantityInTransit: string;
  stockState: "healthy" | "low" | "zero";
};

const quantity = (value: string | number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(Number(value));
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const movementLabel: Record<InventoryMovement["type"], string> = { in: "Entrada", out: "Saída", adjustment: "Ajuste", return: "Devolução" };
const originLabel: Record<InventoryMovement["originType"], string> = { purchase: "Compra", adjustment: "Ajuste manual", return: "Devolução", sale: "Venda" };

function InventoryDetails({ row, movements, open, onOpenChange }: { row: InventoryRow; movements: InventoryMovement[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sale-detail-dialog inventory-detail-dialog"><header className="sale-detail-header"><div className="sale-detail-title"><span className="sale-detail-icon"><AppIcon name="inventory" /></span><div><span className="sale-detail-eyebrow">Posição de estoque</span><DialogTitle>{row.productName}</DialogTitle><DialogDescription>SKU: {row.sku} · Unidade: {row.unit}</DialogDescription></div></div><div className="sale-detail-header-actions"><span className={`inventory-state-badge ${row.stockState}`}>{row.stockState === "healthy" ? "Regular" : row.stockState === "low" ? "Estoque baixo" : "Sem estoque"}</span><DialogClose className="dialog-close" aria-label="Fechar">×</DialogClose></div></header><div className="sale-detail-layout"><div className="sale-detail-main"><section className="sale-detail-card inventory-balance-summary"><div><span>Disponível</span><strong>{quantity(row.quantityAvailable)} {row.unit}</strong></div><div><span>Reservado</span><strong>{quantity(row.quantityReserved)} {row.unit}</strong></div><div><span>Em trânsito</span><strong>{quantity(row.quantityInTransit)} {row.unit}</strong></div></section><section className="sale-detail-card sale-detail-section"><div className="sale-detail-section-heading"><div><span className="sale-detail-section-icon"><AppIcon name="inventory" /></span><div><h3>Histórico de movimentações</h3><p>Registros imutáveis que formam o saldo atual.</p></div></div><strong>{movements.length}</strong></div>{movements.length === 0 ? <div className="sale-detail-empty"><span>—</span><p>Este produto ainda não possui movimentações.</p></div> : <div className="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Origem</th><th>Motivo</th><th className="number">Quantidade</th></tr></thead><tbody>{movements.map(movement => <tr key={movement.id}><td data-label="Data">{dateTime(movement.createdAt)}</td><td data-label="Tipo"><span className={`movement-type ${Number(movement.quantity) < 0 ? "negative" : "positive"}`}>{movementLabel[movement.type]}</span></td><td data-label="Origem">{originLabel[movement.originType]}</td><td data-label="Motivo">{movement.adjustment?.reason ?? "—"}</td><td className={`number movement-quantity ${Number(movement.quantity) < 0 ? "negative" : "positive"}`} data-label="Quantidade">{Number(movement.quantity) > 0 ? "+" : ""}{quantity(movement.quantity)}</td></tr>)}</tbody></table></div>}</section></div><aside className="sale-financial-summary"><div className="sale-financial-heading"><span>Como o saldo funciona</span><p>O estoque é derivado das movimentações e não pode ser sobrescrito.</p></div><dl><div><dt>Entradas registradas</dt><dd>{movements.filter(item => Number(item.quantity) > 0).length}</dd></div><div><dt>Saídas registradas</dt><dd>{movements.filter(item => Number(item.quantity) < 0).length}</dd></div><div><dt>Ajustes manuais</dt><dd>{movements.filter(item => item.originType === "adjustment").length}</dd></div></dl><div className="sale-detail-state draft"><AppIcon name="shield" /><p>Uma correção cria uma nova movimentação compensatória; registros anteriores permanecem no histórico.</p></div></aside></div></DialogContent></Dialog>;
}

export function InventoryRowActions({ row, movements, canAdjust }: { row: InventoryRow; movements: InventoryMovement[]; canAdjust: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  return <><DropdownMenu><DropdownMenuTrigger asChild><button className="row-menu-trigger" type="button" aria-label={`Ações de estoque para ${row.productName}`}><AppIcon name="more" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" sideOffset={6}><DropdownMenuItem className="dropdown-item view" onSelect={() => setDetailsOpen(true)}><span><AppIcon name="eye" /></span><div><strong>Visualizar histórico</strong><small>Entender a formação do saldo</small></div></DropdownMenuItem>{canAdjust && <DropdownMenuItem asChild><Link className="dropdown-item edit" href={`/estoque?new=adjustment&variant=${row.productVariantId}`}><span><AppIcon name="edit" /></span><div><strong>Ajustar estoque</strong><small>Registrar entrada ou saída manual</small></div></Link></DropdownMenuItem>}</DropdownMenuContent></DropdownMenu><InventoryDetails row={row} movements={movements} open={detailsOpen} onOpenChange={setDetailsOpen} /></>;
}

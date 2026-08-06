"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/layout/app-icon";
import { SelectField } from "@/components/ui/select-field";

type Product = { id: string; name: string; sku: string; status: string; variants: Array<{ id: string; skuVariant: string | null }> };
type Balance = { productVariantId: string; quantityAvailable: string };

const formatQuantity = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);

export function StockAdjustmentForm({ products, balances, initialOpen = false, initialVariantId }: { products: Product[]; balances: Balance[]; initialOpen?: boolean; initialVariantId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [variantId, setVariantId] = useState(initialVariantId ?? "");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const currentByVariant = useMemo(() => new Map(balances.map(balance => [balance.productVariantId, Number(balance.quantityAvailable)])), [balances]);
  const current = currentByVariant.get(variantId) ?? 0;
  const absoluteAmount = Number(amount.replace(",", ".")) || 0;
  const delta = direction === "in" ? absoluteAmount : -absoluteAmount;
  const resulting = current + delta;

  function close() {
    setOpen(false);
    setError(undefined);
    if (initialOpen) router.replace("/estoque");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (!variantId || absoluteAmount <= 0) {
      setError("Selecione um produto e informe uma quantidade maior que zero.");
      return;
    }
    if (resulting < 0) {
      setError(`A saída informada supera o saldo disponível de ${formatQuantity(current)}.`);
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ productVariantId: variantId, quantity: delta, reason: values.get("reason") }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "Não foi possível registrar o ajuste.");
      close();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar o ajuste.");
    } finally {
      setPending(false);
    }
  }

  if (!open) return <button className="button button-primary compact-button" type="button" onClick={() => setOpen(true)}><AppIcon name="plus" />Ajustar estoque</button>;

  return <section className="form-card inventory-workspace-form"><header className="form-card-heading"><div><span className="wizard-eyebrow">Movimentação manual</span><h2>Ajuste de estoque</h2><p>Registre a diferença encontrada. O saldo será alterado por uma movimentação auditável, nunca por edição direta.</p></div><button className="close-button" type="button" onClick={close} aria-label="Fechar ajuste">×</button></header><form onSubmit={submit} noValidate>
    <section className="wizard-form-section"><h3>1. Tipo de ajuste</h3><div className="inventory-direction-options"><label className={`inventory-direction-option ${direction === "in" ? "selected" : ""}`}><input type="radio" name="direction" value="in" checked={direction === "in"} onChange={() => setDirection("in")} /><span className="inventory-direction-icon positive"><AppIcon name="imports" /></span><div><strong>Entrada de estoque</strong><small>Contagem maior, item localizado ou correção positiva.</small></div></label><label className={`inventory-direction-option ${direction === "out" ? "selected" : ""}`}><input type="radio" name="direction" value="out" checked={direction === "out"} onChange={() => setDirection("out")} /><span className="inventory-direction-icon negative"><AppIcon name="sales" /></span><div><strong>Saída de estoque</strong><small>Perda, avaria, uso interno ou correção negativa.</small></div></label></div></section>
    <section className="wizard-form-section"><h3>2. Produto e quantidade</h3><div className="form-grid inventory-adjustment-grid"><SelectField label="Produto" name="variant" value={variantId} onChange={event => { setVariantId(event.target.value); setError(undefined); }} required><option value="" disabled>Selecione um produto</option>{products.flatMap(product => product.variants.map(variant => <option key={variant.id} value={variant.id}>{product.name} · {variant.skuVariant || product.sku}{product.status === "inactive" ? " · Inativo" : ""}</option>))}</SelectField><div className="field"><label htmlFor="adjustment-quantity">Quantidade</label><input id="adjustment-quantity" name="quantity" type="number" min="0.001" step="0.001" inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); setError(undefined); }} required placeholder="0" /><small>Informe apenas o valor absoluto; o tipo define entrada ou saída.</small></div></div><div className="inventory-balance-preview"><div><span>Saldo atual</span><strong>{formatQuantity(current)}</strong></div><div><span>{direction === "in" ? "Entrada" : "Saída"}</span><strong className={direction === "in" ? "positive" : "negative"}>{direction === "in" ? "+" : "−"} {formatQuantity(absoluteAmount)}</strong></div><div><span>Saldo resultante</span><strong className={resulting < 0 ? "negative" : ""}>{formatQuantity(resulting)}</strong></div></div></section>
    <section className="wizard-form-section"><h3>3. Justificativa</h3><div className="field"><label htmlFor="adjustment-reason">Motivo do ajuste</label><textarea id="adjustment-reason" name="reason" required maxLength={500} placeholder={direction === "in" ? "Ex.: diferença encontrada na contagem física" : "Ex.: item avariado identificado no inventário"} /><small>O motivo fica vinculado permanentemente à movimentação e à auditoria.</small></div></section>
    <div className="inventory-adjustment-note"><AppIcon name="shield" /><p>A confirmação gera uma movimentação imutável. Se houver erro depois, a correção deverá ser feita por outro ajuste compensatório.</p></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button className="button button-secondary" type="button" onClick={close}>Cancelar</button><button className="button button-primary compact-button" type="submit" disabled={pending || resulting < 0}>{pending ? "Registrando…" : `Confirmar ${direction === "in" ? "entrada" : "saída"}`}</button></div>
  </form></section>;
}

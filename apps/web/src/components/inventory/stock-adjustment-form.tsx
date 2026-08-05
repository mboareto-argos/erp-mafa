"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; sku: string; variants: Array<{ id: string; skuVariant: string | null }> };

export function StockAdjustmentForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget); setPending(true); setError(undefined);
    try { const response = await fetch("/api/inventory/adjustments", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ productVariantId: values.get("variant"), quantity: Number(values.get("quantity")), reason: values.get("reason") }) }); const data = await response.json() as { message?: string }; if (!response.ok) throw new Error(data.message || "Não foi possível registrar o ajuste."); setOpen(false); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar o ajuste."); } finally { setPending(false); }
  }
  if (!open) return <button className="button button-secondary compact-button" onClick={() => setOpen(true)}>Ajustar estoque</button>;
  return <section className="form-card"><div className="form-card-heading"><div><h2>Ajuste de estoque</h2><p>Registre a diferença encontrada. O estoque é atualizado por uma movimentação, nunca por edição direta.</p></div><button className="close-button" onClick={() => setOpen(false)} aria-label="Fechar">×</button></div><form onSubmit={submit}><div className="form-grid"><div className="field"><label>Produto<select name="variant" defaultValue="" required><option value="" disabled>Selecione</option>{products.flatMap(product => product.variants.map(variant => <option key={variant.id} value={variant.id}>{product.name} · {variant.skuVariant || product.sku}</option>))}</select></label></div><div className="field"><label>Diferença de quantidade<input name="quantity" type="number" step="0.001" required placeholder="Ex.: 2 ou -1" aria-describedby="adjustment-help" /></label><small id="adjustment-help">Use positivo para entrada e negativo para saída.</small></div><div className="field"><label>Motivo<input name="reason" required maxLength={500} placeholder="Ex.: contagem física" /></label></div></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary compact-button" disabled={pending}>{pending ? "Registrando…" : "Confirmar ajuste"}</button></form></section>;
}

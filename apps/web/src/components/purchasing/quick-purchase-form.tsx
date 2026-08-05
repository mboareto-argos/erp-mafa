"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; sku: string; variants: Array<{ id: string }> };
type Supplier = { id: string; name: string; status: string };

export function QuickPurchaseForm({ products, suppliers }: { products: Product[]; suppliers: Supplier[] }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined); setPending(true);
    const data = new FormData(event.currentTarget); const product = products.find((item) => item.id === data.get("productId"));
    if (!product?.variants[0]) { setError("Escolha um produto válido."); setPending(false); return; }
    const quantity = Number(data.get("quantity")); const unitCost = Number(data.get("unitCost")); const freight = Number(data.get("freight") || 0);
    try {
      const created = await fetch("/api/purchasing/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId: data.get("supplierId") || undefined, items: [{ productVariantId: product.variants[0].id, quantity, unitCostOriginCurrency: unitCost }] }) });
      const purchase = await created.json() as { id?: string; items?: Array<{ id: string }>; message?: string };
      if (!created.ok || !purchase.id || !purchase.items?.[0]) throw new Error(purchase.message ?? "Não foi possível criar a compra.");
      const ordered = await fetch(`/api/purchasing/purchases/${purchase.id}/order`, { method: "POST" }); if (!ordered.ok) { const r = await ordered.json(); throw new Error(r.message ?? "Não foi possível confirmar a compra."); }
      const received = await fetch(`/api/purchasing/purchases/${purchase.id}/receive`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ items: [{ purchaseItemId: purchase.items[0].id, quantityReceived: quantity }], additionalCosts: freight > 0 ? [{ type: "frete", amount: freight }] : [] }) });
      if (!received.ok) { const r = await received.json(); throw new Error(r.message ?? "Não foi possível receber a compra."); }
      setOpen(false); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível registrar a compra."); } finally { setPending(false); }
  }
  if (!open) return <button className="button button-primary compact-button" onClick={() => setOpen(true)}>Comprei mercadorias</button>;
  return <section className="form-card"><div className="form-card-heading"><div><h2>Comprei mercadorias</h2><p>Ao confirmar, o produto entra no estoque e o custo médio é recalculado.</p></div><button className="close-button" aria-label="Fechar compra" onClick={() => setOpen(false)}>×</button></div><form onSubmit={submit}><div className="form-grid"><div className="field"><label htmlFor="purchase-supplier">Fornecedor <small>(opcional)</small></label><select id="purchase-supplier" name="supplierId"><option value="">Não informar agora</option>{suppliers.filter(s => s.status === "active").map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></div><div className="field"><label htmlFor="purchase-product">Produto</label><select id="purchase-product" name="productId" required><option value="">Selecione</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name} — {product.sku}</option>)}</select></div><div className="field"><label htmlFor="purchase-quantity">Quantidade</label><input id="purchase-quantity" name="quantity" type="number" min="0.001" step="any" required /></div><div className="field"><label htmlFor="purchase-cost">Custo por unidade (R$)</label><input id="purchase-cost" name="unitCost" type="number" min="0" step="0.01" required /></div><div className="field"><label htmlFor="purchase-freight">Frete (R$) <small>(opcional)</small></label><input id="purchase-freight" name="freight" type="number" min="0" step="0.01" /></div></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary compact-button" disabled={pending}>{pending ? "Registrando…" : "Confirmar recebimento"}</button></form></section>;
}

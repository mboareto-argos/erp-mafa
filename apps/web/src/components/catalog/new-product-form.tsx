"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewProductForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true); setError(undefined);
    const minStockValue = formData.get("minStock")?.toString().trim();
    try {
      const response = await fetch("/api/catalog/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku: formData.get("sku"), name: formData.get("name"), unit: formData.get("unit"), ...(minStockValue ? { minStock: Number(minStockValue.replace(",", ".")) } : {}) }) });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cadastrar o produto.");
      setOpen(false); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível cadastrar o produto."); }
    finally { setPending(false); }
  }

  if (!open) return <button className="button button-primary compact-button" onClick={() => setOpen(true)}>Novo produto</button>;
  return <section className="form-card"><div className="form-card-heading"><div><h2>Novo produto</h2><p>O custo será calculado quando você receber a compra.</p></div><button className="close-button" aria-label="Fechar cadastro" onClick={() => setOpen(false)}>×</button></div><form onSubmit={submit} noValidate><div className="form-grid"><div className="field"><label htmlFor="product-name">Nome do produto</label><input id="product-name" name="name" required maxLength={160} /></div><div className="field"><label htmlFor="product-sku">SKU</label><input id="product-sku" name="sku" required maxLength={60} /></div><div className="field"><label htmlFor="product-unit">Unidade</label><input id="product-unit" name="unit" defaultValue="un" required maxLength={20} /></div><div className="field"><label htmlFor="product-min-stock">Estoque mínimo <small>(opcional)</small></label><input id="product-min-stock" name="minStock" inputMode="decimal" /></div></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary compact-button" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar produto"}</button></form></section>;
}

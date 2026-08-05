"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; sku: string; variants: Array<{ id: string }> };
type Supplier = { id: string; name: string; status: string };
type Line = { productId: string; quantity: string; unitCost: string };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function WizardSteps({ current }: { current: number }) {
  return <ol className="wizard-steps" aria-label="Etapas da compra">{["Itens", "Custos", "Confirmar"].map((label, index) => <li key={label} className={index === current ? "active" : index < current ? "done" : ""}><span>{index < current ? "✓" : index + 1}</span>{label}</li>)}</ol>;
}

export function QuickPurchaseForm({ products, suppliers }: { products: Product[]; suppliers: Supplier[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false); const [step, setStep] = useState(0); const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  const [supplierId, setSupplierId] = useState(""); const [freight, setFreight] = useState(""); const [idempotencyKey, setIdempotencyKey] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1", unitCost: "" }]);
  const totalItems = useMemo(() => lines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitCost || 0), 0), [lines]);
  const total = totalItems + Number(freight || 0);
  const update = (index: number, field: keyof Line, value: string) => setLines(current => current.map((line, i) => i === index ? { ...line, [field]: value } : line));
  function close() { setOpen(false); setStep(0); setError(undefined); }
  function nextStep() { setError(undefined); if (step === 0 && lines.some(line => !line.productId || Number(line.quantity) <= 0 || Number(line.unitCost) < 0)) return setError("Complete os itens, as quantidades e os valores da compra."); setStep(current => current + 1); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(undefined);
    const items = lines.map(line => { const product = products.find(item => item.id === line.productId); return product?.variants[0] ? { productVariantId: product.variants[0].id, quantity: Number(line.quantity), unitCostOriginCurrency: Number(line.unitCost) } : null; });
    if (items.some(item => !item)) { setError("Revise os itens antes de confirmar."); setPending(false); return; }
    const key = idempotencyKey || crypto.randomUUID(); setIdempotencyKey(key);
    try {
      const created = await fetch("/api/purchasing/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId: supplierId || undefined, items }) });
      const purchase = await created.json() as { id?: string; items?: Array<{ id: string }>; message?: string };
      if (!created.ok || !purchase.id || !purchase.items) throw new Error(purchase.message ?? "Não foi possível criar a compra.");
      const ordered = await fetch(`/api/purchasing/purchases/${purchase.id}/order`, { method: "POST" }); if (!ordered.ok) throw new Error("Não foi possível confirmar a compra.");
      const received = await fetch(`/api/purchasing/purchases/${purchase.id}/receive`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ items: purchase.items.map((item, index) => ({ purchaseItemId: item.id, quantityReceived: Number(lines[index].quantity) })), additionalCosts: Number(freight) > 0 ? [{ type: "frete", amount: Number(freight) }] : [] }) });
      if (!received.ok) { const result = await received.json() as { message?: string }; throw new Error(result.message ?? "Não foi possível receber a compra."); }
      close(); setLines([{ productId: "", quantity: "1", unitCost: "" }]); setSupplierId(""); setFreight(""); setIdempotencyKey(""); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar a compra."); } finally { setPending(false); }
  }
  if (!open) return <button className="button button-primary compact-button" onClick={() => setOpen(true)}>Comprei mercadorias</button>;
  return <section className="form-card"><div className="form-card-heading"><div><h2>Comprei mercadorias</h2><p>O estoque entra e o custo final é calculado com os custos adicionais.</p></div><button className="close-button" aria-label="Fechar compra" onClick={close}>×</button></div><WizardSteps current={step} />
    <form onSubmit={submit}>
      {step === 0 && <><div className="field"><label>Fornecedor <small>(opcional)</small><select value={supplierId} onChange={event => setSupplierId(event.target.value)}><option value="">Não informar agora</option>{suppliers.filter(supplier => supplier.status === "active").map(supplier => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></label></div><fieldset className="sale-lines"><legend>Itens recebidos</legend>{lines.map((line, index) => <div className="sale-line" key={index}><div className="field"><label>Produto<select value={line.productId} onChange={event => update(index, "productId", event.target.value)}><option value="">Selecione</option>{products.map(product => <option value={product.id} key={product.id}>{product.name} · {product.sku}</option>)}</select></label></div><div className="field"><label>Quantidade<input value={line.quantity} onChange={event => update(index, "quantity", event.target.value)} type="number" min="0.001" step="any" /></label></div><div className="field"><label>Valor unitário (R$)<input value={line.unitCost} onChange={event => update(index, "unitCost", event.target.value)} type="number" min="0" step="0.01" /></label></div>{lines.length > 1 && <button className="line-remove" type="button" onClick={() => setLines(current => current.filter((_, i) => i !== index))}>Remover</button>}</div>)}</fieldset><button className="text-link button-link" type="button" onClick={() => setLines(current => [...current, { productId: "", quantity: "1", unitCost: "" }])}>+ Adicionar item</button></>}
      {step === 1 && <div className="field"><label>Frete (R$) <small>(opcional; será rateado para calcular o custo final)</small><input value={freight} onChange={event => setFreight(event.target.value)} type="number" min="0" step="0.01" /></label></div>}
      {step === 2 && <section className="summary-list"><div><dt>Itens recebidos</dt><dd>{lines.length} {lines.length === 1 ? "produto" : "produtos"}</dd></div><div><dt>Fornecedor</dt><dd>{suppliers.find(supplier => supplier.id === supplierId)?.name ?? "Não informado"}</dd></div><div><dt>Estoque</dt><dd>será atualizado automaticamente</dd></div><div><dt>Custo</dt><dd>será calculado com o rateio do frete</dd></div></section>}
      <div className="wizard-summary"><span>Total estimado</span><strong>{money(total)}</strong></div>{error && <p className="form-error" role="alert">{error}</p>}
      <div className="wizard-actions">{step > 0 ? <button className="button button-secondary compact-button" type="button" onClick={() => setStep(current => current - 1)}>Voltar</button> : <span />}{step < 2 ? <button className="button button-primary compact-button" type="button" onClick={nextStep}>Continuar</button> : <button className="button button-primary compact-button" disabled={pending}>{pending ? "Registrando…" : "Confirmar recebimento"}</button>}</div>
    </form></section>;
}

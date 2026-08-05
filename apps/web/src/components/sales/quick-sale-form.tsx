"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; sku: string; variants: { id: string }[]; prices: { salePrice: string }[] };
type Method = { id: string; name: string; status: string };
type Customer = { id: string; name: string; status: string };
type SaleLine = { productId: string; quantity: string; price: string };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function WizardSteps({ current }: { current: number }) {
  return <ol className="wizard-steps" aria-label="Etapas da venda">{["Itens", "Pagamento", "Confirmar"].map((label, index) => <li key={label} className={index === current ? "active" : index < current ? "done" : ""}><span>{index < current ? "✓" : index + 1}</span>{label}</li>)}</ol>;
}

export function QuickSaleForm({ products, methods, customers }: { products: Product[]; methods: Method[]; customers: Customer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false); const [step, setStep] = useState(0); const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  const [lines, setLines] = useState<SaleLine[]>([{ productId: "", quantity: "1", price: "" }]);
  const [customerId, setCustomerId] = useState(""); const [channel, setChannel] = useState("presencial"); const [methodId, setMethodId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const estimatedTotal = useMemo(() => lines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.price || 0), 0), [lines]);
  const updateLine = (index: number, field: keyof SaleLine, value: string) => setLines(current => current.map((line, currentIndex) => currentIndex === index ? { ...line, [field]: value } : line));
  function chooseProduct(index: number, productId: string) { const product = products.find(item => item.id === productId); updateLine(index, "productId", productId); if (product?.prices[0]) updateLine(index, "price", product.prices[0].salePrice); }
  function nextStep() {
    setError(undefined);
    if (step === 0 && lines.some(line => !line.productId || Number(line.quantity) <= 0 || Number(line.price) < 0)) return setError("Complete os itens, as quantidades e os preços antes de continuar.");
    if (step === 1 && !methodId) return setError("Escolha a forma de pagamento para continuar.");
    setStep(current => current + 1);
  }
  function close() { setOpen(false); setStep(0); setError(undefined); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(undefined);
    const items = lines.map(line => { const product = products.find(item => item.id === line.productId); return product?.variants[0] ? { productVariantId: product.variants[0].id, quantity: Number(line.quantity), unitPrice: Number(line.price), discount: 0 } : null; });
    const method = methods.find(item => item.id === methodId);
    if (items.some(item => !item) || !method) { setError("Revise os itens e a forma de pagamento."); setPending(false); return; }
    const key = idempotencyKey || crypto.randomUUID(); setIdempotencyKey(key);
    try {
      const created = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: customerId || undefined, channel, items }) });
      const sale = await created.json() as { id?: string; total?: string; message?: string };
      if (!created.ok || !sale.id || !sale.total) throw new Error(sale.message ?? "Não foi possível criar a venda.");
      const confirmed = await fetch(`/api/sales/${sale.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ payments: [{ paymentMethodId: method.id, amount: Number(sale.total) }] }) });
      const confirmation = await confirmed.json() as { message?: string };
      if (!confirmed.ok) throw new Error(confirmation.message ?? "Não foi possível confirmar a venda.");
      close(); setLines([{ productId: "", quantity: "1", price: "" }]); setCustomerId(""); setMethodId(""); setIdempotencyKey(""); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar a venda."); } finally { setPending(false); }
  }
  if (!methods.some(method => method.status === "active")) return <p className="form-error">Configure uma forma de pagamento vinculada a uma conta financeira antes de registrar uma venda.</p>;
  if (!open) return <button className="button button-primary compact-button" onClick={() => setOpen(true)}>Nova venda</button>;

  return <section className="form-card"><div className="form-card-heading"><div><h2>Nova venda</h2><p>Registre em etapas; seus dados permanecem ao voltar.</p></div><button className="close-button" onClick={close} aria-label="Fechar venda">×</button></div><WizardSteps current={step} />
    <form onSubmit={submit}>
      {step === 0 && <fieldset className="sale-lines"><legend>Itens da venda</legend>{lines.map((line, index) => <div className="sale-line" key={index}><div className="field"><label>Produto<select value={line.productId} onChange={event => chooseProduct(index, event.target.value)}><option value="">Selecione</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label></div><div className="field"><label>Quantidade<input value={line.quantity} onChange={event => updateLine(index, "quantity", event.target.value)} type="number" min="0.001" step="0.001" /></label></div><div className="field"><label>Preço unitário (R$)<input value={line.price} onChange={event => updateLine(index, "price", event.target.value)} type="number" min="0" step="0.01" /></label></div>{lines.length > 1 && <button type="button" className="line-remove" onClick={() => setLines(current => current.filter((_, currentIndex) => currentIndex !== index))}>Remover</button>}</div>)}</fieldset>}
      {step === 0 && <button type="button" className="text-link button-link" onClick={() => setLines(current => [...current, { productId: "", quantity: "1", price: "" }])}>+ Adicionar item</button>}
      {step === 1 && <div className="form-grid"><div className="field"><label>Cliente <small>(opcional)</small><select value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Consumidor final</option>{customers.filter(customer => customer.status === "active").map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label></div><div className="field"><label>Pagamento<select value={methodId} onChange={event => setMethodId(event.target.value)}><option value="">Selecione</option>{methods.filter(method => method.status === "active").map(method => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label></div><div className="field"><label>Canal<select value={channel} onChange={event => setChannel(event.target.value)}><option value="presencial">Presencial</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option></select></label></div></div>}
      {step === 2 && <section className="summary-list"><div><dt>Itens</dt><dd>{lines.length} {lines.length === 1 ? "produto" : "produtos"}</dd></div><div><dt>Pagamento</dt><dd>{methods.find(method => method.id === methodId)?.name}</dd></div><div><dt>Estoque</dt><dd>será baixado automaticamente</dd></div><div><dt>Financeiro</dt><dd>recebimento e caixa serão atualizados</dd></div></section>}
      <div className="wizard-summary"><span>Total estimado</span><strong>{money(estimatedTotal)}</strong></div>{error && <p className="form-error" role="alert">{error}</p>}
      <div className="wizard-actions">{step > 0 ? <button className="button button-secondary compact-button" type="button" onClick={() => setStep(current => current - 1)}>Voltar</button> : <span />}{step < 2 ? <button className="button button-primary compact-button" type="button" onClick={nextStep}>Continuar</button> : <button className="button button-primary compact-button" disabled={pending}>{pending ? "Confirmando…" : "Confirmar venda"}</button>}</div>
    </form></section>;
}

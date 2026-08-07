"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SelectField } from "@/components/ui/select-field";

type Product = { id: string; name: string; sku: string; status: string; variants: { id: string }[]; prices: { salePrice: string }[] };
type Method = { id: string; name: string; status: string };
type Customer = { id: string; name: string; status: string };
type SaleLine = { productId: string; quantity: string; price: string };
type EditableSale = { id: string; customerId?: string | null; channel: string; discount: string; items: Array<{ productVariantId: string; quantity: string; unitPrice: string }> };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function WizardSteps({ current }: { current: number }) {
  return <ol className="wizard-steps" aria-label="Etapas da venda">{["Itens", "Pagamento", "Confirmar"].map((label, index) => <li key={label} className={index === current ? "active" : index < current ? "done" : ""}><span>{index < current ? "✓" : index + 1}</span><strong>{label}</strong></li>)}</ol>;
}

export function QuickSaleForm({ products, methods, customers, initialOpen = false, editingSale }: { products: Product[]; methods: Method[]; customers: Customer[]; initialOpen?: boolean; editingSale?: EditableSale }) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen); const [step, setStep] = useState(0); const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  const [lines, setLines] = useState<SaleLine[]>(() => editingSale ? editingSale.items.map(item => ({ productId: products.find(product => product.variants.some(variant => variant.id === item.productVariantId))?.id ?? "", quantity: item.quantity, price: item.unitPrice })) : [{ productId: "", quantity: "1", price: "" }]);
  const [customerId, setCustomerId] = useState(editingSale?.customerId ?? ""); const [channel, setChannel] = useState(editingSale?.channel ?? "presencial"); const [methodId, setMethodId] = useState(""); const [discount, setDiscount] = useState(editingSale?.discount ?? "");
  const [paymentMode, setPaymentMode] = useState<"immediate" | "installments">("immediate"); const [upfront, setUpfront] = useState(""); const [installmentCount, setInstallmentCount] = useState("2"); const [firstDueDate, setFirstDueDate] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const subtotal = useMemo(() => lines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.price || 0), 0), [lines]);
  const estimatedTotal = Math.max(0, subtotal - Number(discount || 0));
  const updateLine = (index: number, field: keyof SaleLine, value: string) => setLines(current => current.map((line, currentIndex) => currentIndex === index ? { ...line, [field]: value } : line));
  function chooseProduct(index: number, productId: string) { const product = products.find(item => item.id === productId); updateLine(index, "productId", productId); if (product?.prices[0]) updateLine(index, "price", product.prices[0].salePrice); }
  function nextStep() {
    setError(undefined);
    if (step === 0 && lines.some(line => !line.productId || Number(line.quantity) <= 0 || Number(line.price) < 0)) return setError("Complete os itens, as quantidades e os preços antes de continuar.");
    if (step === 1 && paymentMode === "immediate" && !methodId) return setError("Escolha a forma de pagamento para continuar.");
    if (step === 1 && paymentMode === "installments" && !customerId) return setError("Selecione um cliente para registrar a venda a prazo.");
    if (step === 1 && paymentMode === "installments" && !firstDueDate) return setError("Informe a primeira data de vencimento.");
    if (step === 1 && Number(upfront || 0) > 0 && !methodId) return setError("Escolha a forma de pagamento da entrada.");
    if (step === 1 && Number(discount || 0) > subtotal) return setError("O desconto não pode ser maior que o subtotal da venda.");
    setStep(current => current + 1);
  }
  function close() { setOpen(false); setStep(0); setError(undefined); if (editingSale) router.replace("/vendas"); }
  function resetForm() { setLines([{ productId: "", quantity: "1", price: "" }]); setCustomerId(""); setMethodId(""); setDiscount(""); setPaymentMode("immediate"); setUpfront(""); setFirstDueDate(""); setIdempotencyKey(""); }
  async function createOrUpdateSale() {
    const items = lines.map(line => { const product = products.find(item => item.id === line.productId); return product?.variants[0] ? { productVariantId: product.variants[0].id, quantity: Number(line.quantity), unitPrice: Number(line.price), discount: 0 } : null; });
    if (items.some(item => !item)) throw new Error("Revise os itens da venda.");
    const created = await fetch(editingSale ? `/api/sales/${editingSale.id}` : "/api/sales", { method: editingSale ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: customerId || undefined, channel, discount: Number(discount || 0), items }) });
    const sale = await created.json() as { id?: string; total?: string; message?: string };
    if (!created.ok || !sale.id || !sale.total) throw new Error(sale.message ?? "Não foi possível criar a venda.");
    return sale as { id: string; total: string };
  }
  // Cria/atualiza a venda sem confirmar — sem forma de pagamento nem baixa de estoque.
  // A ação "Confirmar venda" na listagem completa esse fluxo depois.
  async function saveDraft() {
    setPending(true); setError(undefined);
    try {
      await createOrUpdateSale();
      close(); resetForm(); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar o rascunho."); } finally { setPending(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 2) { nextStep(); return; }
    setPending(true); setError(undefined);
    const method = methods.find(item => item.id === methodId);
    if (paymentMode === "immediate" && !method) { setError("Revise a forma de pagamento."); setPending(false); return; }
    const key = idempotencyKey || crypto.randomUUID(); setIdempotencyKey(key);
    try {
      const sale = await createOrUpdateSale();
      const immediateAmount = paymentMode === "immediate" ? Number(sale.total) : Math.min(Number(upfront || 0), Number(sale.total));
      const confirmed = await fetch(`/api/sales/${sale.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ payments: immediateAmount > 0 && method ? [{ paymentMethodId: method.id, amount: immediateAmount }] : [], installmentPlan: paymentMode === "installments" && immediateAmount < Number(sale.total) ? { count: Number(installmentCount), firstDueDate } : undefined }) });
      const confirmation = await confirmed.json() as { message?: string };
      if (!confirmed.ok) throw new Error(confirmation.message ?? "Não foi possível confirmar a venda.");
      close(); resetForm(); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar a venda."); } finally { setPending(false); }
  }
  if (!methods.some(method => method.status === "active")) return <p className="form-error">Configure uma forma de pagamento vinculada a uma conta financeira antes de registrar uma venda.</p>;
  if (!open) return <button className="button button-primary compact-button" onClick={() => setOpen(true)}>Nova venda</button>;

  return <section className="form-card wizard-card">
    <header className="form-card-heading wizard-heading">
      <div><span className="wizard-eyebrow">Vendas</span><h2>{editingSale ? `Editar venda #${editingSale.id.slice(0, 8)}` : "Nova venda"}</h2><p>{editingSale ? "Revise o rascunho e conclua quando os dados estiverem corretos." : "Registre a operação em poucos passos. Seus dados permanecem salvos ao voltar."}</p></div>
      <button className="close-button" onClick={close} aria-label="Fechar venda">×</button>
    </header>
    <WizardSteps current={step} />
    <form onSubmit={submit}>
      <div className="wizard-layout">
        <div className="wizard-main">
          {step === 0 && <>
            <div className="wizard-stage-heading"><span>1</span><div><h3>Itens da venda</h3><p>Selecione os produtos e informe as quantidades desta operação.</p></div></div>
            <fieldset className="sale-lines"><legend className="sr-only">Itens da venda</legend>{lines.map((line, index) => <div className="sale-line" key={index}><SelectField label="Produto" value={line.productId} onChange={event => chooseProduct(index, event.target.value)}><option value="">Selecione um produto</option>{products.filter(product => product.status === "active").map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</SelectField><div className="field"><label htmlFor={`sale-quantity-${index}`}>Quantidade</label><input id={`sale-quantity-${index}`} value={line.quantity} onChange={event => updateLine(index, "quantity", event.target.value)} type="number" min="0.001" step="0.001" /></div><CurrencyInput label="Preço unitário" value={line.price} onValueChange={value => updateLine(index, "price", value)} required min={0} />{lines.length > 1 && <button type="button" className="line-remove" onClick={() => setLines(current => current.filter((_, currentIndex) => currentIndex !== index))}>Remover</button>}</div>)}</fieldset>
            <button type="button" className="button button-secondary wizard-add-item" onClick={() => setLines(current => [...current, { productId: "", quantity: "1", price: "" }])}>+ Adicionar item</button>
          </>}
          {step === 1 && <>
            <div className="wizard-stage-heading"><span>2</span><div><h3>Pagamento e dados da venda</h3><p>Escolha como o cliente pagará e complete os dados comerciais.</p></div></div>
            <fieldset className="payment-options"><legend>Quando o cliente vai pagar?</legend><div><label className={`payment-option${paymentMode === "immediate" ? " selected" : ""}`}><input type="radio" checked={paymentMode === "immediate"} onChange={() => { setPaymentMode("immediate"); setUpfront(""); }} /><span className="payment-radio" /><span><strong>Receber agora</strong><small>Registra a entrada no caixa imediatamente</small></span></label><label className={`payment-option${paymentMode === "installments" ? " selected" : ""}`}><input type="radio" checked={paymentMode === "installments"} onChange={() => setPaymentMode("installments")} /><span className="payment-radio" /><span><strong>Receber a prazo</strong><small>Cria parcelas no contas a receber</small></span></label></div></fieldset>
            {(paymentMode === "immediate" || Number(upfront || 0) > 0) && <fieldset className="payment-options"><legend>{paymentMode === "immediate" ? "Forma de pagamento" : "Forma de pagamento da entrada"}</legend><div>{methods.filter(method => method.status === "active").map(method => <label className={`payment-option${methodId === method.id ? " selected" : ""}`} key={method.id}><input type="radio" name="payment-method" checked={methodId === method.id} onChange={() => setMethodId(method.id)} /><span className="payment-radio" aria-hidden="true" /><span><strong>{method.name}</strong><small>{methodId === method.id ? "Selecionada" : "Selecionar"}</small></span></label>)}</div></fieldset>}
            {paymentMode === "installments" && <div className="wizard-form-section"><h4>Agenda de recebimento</h4><div className="form-grid wizard-form-grid-three"><CurrencyInput label="Entrada agora" value={upfront} onValueChange={setUpfront} min={0} max={estimatedTotal} hint="Opcional; o restante será parcelado." /><div className="field"><label htmlFor="sale-installments">Número de parcelas</label><input id="sale-installments" type="number" min="1" max="60" value={installmentCount} onChange={event => setInstallmentCount(event.target.value)} /></div><div className="field"><label htmlFor="sale-first-due">Primeiro vencimento</label><input id="sale-first-due" type="date" value={firstDueDate} onChange={event => setFirstDueDate(event.target.value)} /></div></div></div>}
            <div className="wizard-form-section"><h4>Dados gerais</h4><div className="form-grid wizard-form-grid-three"><SelectField label={<>Cliente <small>(opcional)</small></>} value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Consumidor final</option>{customers.filter(customer => customer.status === "active").map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</SelectField><SelectField label="Canal" value={channel} onChange={event => setChannel(event.target.value)}><option value="presencial">Presencial</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option></SelectField><CurrencyInput label="Desconto da venda" value={discount} onValueChange={setDiscount} min={0} max={subtotal} hint="Registrado separadamente do preço." /></div></div>
          </>}
          {step === 2 && <>
            <div className="wizard-stage-heading"><span>3</span><div><h3>Revise e confirme</h3><p>Confira os dados antes de concluir. Estoque e financeiro serão atualizados.</p></div></div>
            <section className="summary-list"><div><dt>Itens</dt><dd>{lines.length} {lines.length === 1 ? "produto" : "produtos"}</dd></div><div><dt>Pagamento</dt><dd>{paymentMode === "immediate" ? methods.find(method => method.id === methodId)?.name : `${installmentCount}x a prazo${Number(upfront || 0) > 0 ? " com entrada" : ""}`}</dd></div><div><dt>Estoque</dt><dd>Será baixado automaticamente</dd></div><div><dt>Financeiro</dt><dd>{paymentMode === "immediate" ? "Recebimento e caixa serão atualizados" : "Parcelas serão criadas automaticamente"}</dd></div></section>
            <p className="wizard-confirmation-note">Ao confirmar, esta venda passa a compor o histórico operacional e não será apagada.</p>
          </>}
        </div>
        <aside className="wizard-side-summary"><div className="wizard-summary-heading"><span>Resumo</span><h3>Resumo da venda</h3></div><dl><div><dt>Itens</dt><dd>{lines.length}</dd></div><div><dt>Unidades</dt><dd>{lines.reduce((total, line) => total + Number(line.quantity || 0), 0)}</dd></div><div><dt>Cliente</dt><dd>{customers.find(customer => customer.id === customerId)?.name ?? "Consumidor final"}</dd></div><div><dt>Pagamento</dt><dd>{paymentMode === "immediate" ? methods.find(method => method.id === methodId)?.name ?? "A definir" : `${installmentCount}x a prazo`}</dd></div><div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div><div><dt>Desconto</dt><dd>{money(Number(discount || 0))}</dd></div>{paymentMode === "installments" && <div><dt>Entrada</dt><dd>{money(Number(upfront || 0))}</dd></div>}</dl><div className="wizard-summary"><span>Total estimado</span><strong>{money(estimatedTotal)}</strong></div><p>{paymentMode === "installments" ? `Saldo parcelado: ${money(Math.max(0, estimatedTotal - Number(upfront || 0)))}` : "Os valores podem ser revisados até a confirmação."}</p></aside>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="wizard-actions">{step > 0 ? <button className="button button-secondary" type="button" onClick={() => setStep(current => current - 1)}>← Voltar</button> : <button className="button button-secondary" type="button" onClick={close}>Cancelar</button>}<button className="button button-secondary" type="button" onClick={saveDraft} disabled={pending}>{pending ? "Salvando…" : "Salvar rascunho"}</button>{step < 2 ? <button key="sale-next-step" className="button button-primary" type="button" onClick={event => { event.preventDefault(); nextStep(); }}>Continuar →</button> : <button key="sale-submit" className="button button-primary" type="submit" disabled={pending}>{pending ? "Concluindo…" : "Concluir venda"}</button>}</div>
    </form>
  </section>;
}

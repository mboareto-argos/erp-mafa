"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SelectField } from "@/components/ui/select-field";

type Product = { id: string; name: string; sku: string; status: string; variants: Array<{ id: string }> };
type Supplier = { id: string; name: string; status: string };
type Line = { productId: string; quantity: string; unitCost: string };
type EditablePurchase = { id: string; supplierId?: string | null; items: Array<{ productVariantId: string; quantity: string; unitCostOriginCurrency: string }> };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function WizardSteps({ current }: { current: number }) {
  return <ol className="wizard-steps" aria-label="Etapas da compra">{["Itens", "Custos", "Confirmar"].map((label, index) => <li key={label} className={index === current ? "active" : index < current ? "done" : ""}><span>{index < current ? "✓" : index + 1}</span><strong>{label}</strong></li>)}</ol>;
}

export function QuickPurchaseForm({ products, suppliers, initialOpen = false, editingPurchase }: { products: Product[]; suppliers: Supplier[]; initialOpen?: boolean; editingPurchase?: EditablePurchase }) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen); const [step, setStep] = useState(0); const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  const [supplierId, setSupplierId] = useState(editingPurchase?.supplierId ?? ""); const [freight, setFreight] = useState(""); const [hasFreight, setHasFreight] = useState(false); const [idempotencyKey, setIdempotencyKey] = useState("");
  const [createPayables, setCreatePayables] = useState(false); const [installmentCount, setInstallmentCount] = useState("1"); const [firstDueDate, setFirstDueDate] = useState("");
  const [lines, setLines] = useState<Line[]>(() => editingPurchase ? editingPurchase.items.map(item => ({ productId: products.find(product => product.variants.some(variant => variant.id === item.productVariantId))?.id ?? "", quantity: item.quantity, unitCost: item.unitCostOriginCurrency })) : [{ productId: "", quantity: "1", unitCost: "" }]);
  const totalItems = useMemo(() => lines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitCost || 0), 0), [lines]);
  const total = totalItems + Number(freight || 0);
  const update = (index: number, field: keyof Line, value: string) => setLines(current => current.map((line, i) => i === index ? { ...line, [field]: value } : line));
  function close() { setOpen(false); setStep(0); setError(undefined); if (editingPurchase) router.replace("/compras"); }
  function nextStep() { setError(undefined); if (step === 0 && lines.some(line => !line.productId || Number(line.quantity) <= 0 || Number(line.unitCost) < 0)) return setError("Complete os itens, as quantidades e os valores da compra."); if (step === 1 && createPayables && !supplierId) return setError("Selecione um fornecedor para registrar a compra a prazo."); if (step === 1 && createPayables && !firstDueDate) return setError("Informe o primeiro vencimento."); setStep(current => current + 1); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 2) { nextStep(); return; }
    setPending(true); setError(undefined);
    const items = lines.map(line => { const product = products.find(item => item.id === line.productId); return product?.variants[0] ? { productVariantId: product.variants[0].id, quantity: Number(line.quantity), unitCostOriginCurrency: Number(line.unitCost) } : null; });
    if (items.some(item => !item)) { setError("Revise os itens antes de confirmar."); setPending(false); return; }
    const key = idempotencyKey || crypto.randomUUID(); setIdempotencyKey(key);
    try {
      const created = await fetch(editingPurchase ? `/api/purchasing/purchases/${editingPurchase.id}` : "/api/purchasing/purchases", { method: editingPurchase ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId: supplierId || undefined, items }) });
      const purchase = await created.json() as { id?: string; items?: Array<{ id: string }>; message?: string };
      if (!created.ok || !purchase.id || !purchase.items) throw new Error(purchase.message ?? "Não foi possível criar a compra.");
      const ordered = await fetch(`/api/purchasing/purchases/${purchase.id}/order`, { method: "POST" }); if (!ordered.ok) throw new Error("Não foi possível confirmar a compra.");
      const received = await fetch(`/api/purchasing/purchases/${purchase.id}/receive`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ items: purchase.items.map((item, index) => ({ purchaseItemId: item.id, quantityReceived: Number(lines[index].quantity) })), additionalCosts: Number(freight) > 0 ? [{ type: "frete", amount: Number(freight) }] : [], installmentPlan: createPayables ? { count: Number(installmentCount), firstDueDate } : undefined }) });
      if (!received.ok) { const result = await received.json() as { message?: string }; throw new Error(result.message ?? "Não foi possível receber a compra."); }
      close(); setLines([{ productId: "", quantity: "1", unitCost: "" }]); setSupplierId(""); setFreight(""); setHasFreight(false); setCreatePayables(false); setFirstDueDate(""); setIdempotencyKey(""); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar a compra."); } finally { setPending(false); }
  }
  if (!open) return <button className="button button-primary compact-button" onClick={() => setOpen(true)}>Nova compra</button>;
  return <section className="form-card wizard-card">
    <header className="form-card-heading wizard-heading">
      <div><span className="wizard-eyebrow">Compras</span><h2>{editingPurchase ? `Editar compra #${editingPurchase.id.slice(0, 8)}` : "Nova compra"}</h2><p>{editingPurchase ? "Revise o rascunho e conclua o recebimento quando os dados estiverem corretos." : "Registre o recebimento em etapas. O estoque e o custo final serão calculados automaticamente."}</p></div>
      <button className="close-button" aria-label="Fechar compra" onClick={close}>×</button>
    </header>
    <WizardSteps current={step} />
    <form onSubmit={submit}>
      <div className="wizard-layout">
        <div className="wizard-main">
          {step === 0 && <>
            <div className="wizard-stage-heading"><span>1</span><div><h3>Fornecedor e itens recebidos</h3><p>Identifique a origem da compra e informe os produtos que entraram.</p></div></div>
            <div className="wizard-form-section"><SelectField label={<>Fornecedor <small>(opcional)</small></>} value={supplierId} onChange={event => setSupplierId(event.target.value)}><option value="">Não informar agora</option>{suppliers.filter(supplier => supplier.status === "active").map(supplier => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</SelectField></div>
            <fieldset className="sale-lines"><legend className="sr-only">Itens recebidos</legend>{lines.map((line, index) => <div className="sale-line" key={index}><SelectField label="Produto" value={line.productId} onChange={event => update(index, "productId", event.target.value)}><option value="">Selecione um produto</option>{products.filter(product => product.status === "active").map(product => <option value={product.id} key={product.id}>{product.name} · {product.sku}</option>)}</SelectField><div className="field"><label htmlFor={`purchase-quantity-${index}`}>Quantidade</label><input id={`purchase-quantity-${index}`} value={line.quantity} onChange={event => update(index, "quantity", event.target.value)} type="number" min="0.001" step="any" /></div><CurrencyInput label="Valor unitário" value={line.unitCost} onValueChange={value => update(index, "unitCost", value)} required min={0} />{lines.length > 1 && <button className="line-remove" type="button" onClick={() => setLines(current => current.filter((_, i) => i !== index))}>Remover</button>}</div>)}</fieldset>
            <button className="button button-secondary wizard-add-item" type="button" onClick={() => setLines(current => [...current, { productId: "", quantity: "1", unitCost: "" }])}>+ Adicionar item</button>
          </>}
          {step === 1 && <>
            <div className="wizard-stage-heading"><span>2</span><div><h3>Custos adicionais</h3><p>Informe se houve frete. Esse valor será rateado no custo dos produtos.</p></div></div>
            <fieldset className="payment-options"><legend>Frete da compra</legend><div>
              <label className={`payment-option${!hasFreight ? " selected" : ""}`}><input type="radio" name="freight-option" checked={!hasFreight} onChange={() => { setHasFreight(false); setFreight(""); }} /><span className="payment-radio" aria-hidden="true" /><span><strong>Sem frete</strong><small>Nenhum custo adicional será aplicado</small></span></label>
              <label className={`payment-option${hasFreight ? " selected" : ""}`}><input type="radio" name="freight-option" checked={hasFreight} onChange={() => setHasFreight(true)} /><span className="payment-radio" aria-hidden="true" /><span><strong>Informar frete</strong><small>Ratear o valor entre os itens recebidos</small></span></label>
            </div></fieldset>
            {hasFreight && <div className="wizard-form-section"><CurrencyInput label="Valor do frete" value={freight} onValueChange={setFreight} min={0} /></div>}
            <fieldset className="payment-options"><legend>Financeiro da compra</legend><div><label className={`payment-option${!createPayables ? " selected" : ""}`}><input type="radio" checked={!createPayables} onChange={() => setCreatePayables(false)} /><span className="payment-radio" /><span><strong>Não registrar agora</strong><small>A compra entra no estoque sem compromisso financeiro</small></span></label><label className={`payment-option${createPayables ? " selected" : ""}`}><input type="radio" checked={createPayables} onChange={() => setCreatePayables(true)} /><span className="payment-radio" /><span><strong>Compra a prazo</strong><small>Gerar parcelas automaticamente no contas a pagar</small></span></label></div></fieldset>
            {createPayables && <div className="wizard-form-section"><h4>Agenda de pagamento</h4><div className="form-grid"><div className="field"><label htmlFor="purchase-installments">Número de parcelas</label><input id="purchase-installments" type="number" min="1" max="60" value={installmentCount} onChange={event => setInstallmentCount(event.target.value)} /></div><div className="field"><label htmlFor="purchase-first-due">Primeiro vencimento</label><input id="purchase-first-due" type="date" value={firstDueDate} onChange={event => setFirstDueDate(event.target.value)} /></div></div></div>}
          </>}
          {step === 2 && <>
            <div className="wizard-stage-heading"><span>3</span><div><h3>Revise e confirme</h3><p>Confira os dados antes de atualizar o estoque e registrar o custo.</p></div></div>
            <section className="summary-list"><div><dt>Itens recebidos</dt><dd>{lines.length} {lines.length === 1 ? "produto" : "produtos"}</dd></div><div><dt>Fornecedor</dt><dd>{suppliers.find(supplier => supplier.id === supplierId)?.name ?? "Não informado"}</dd></div><div><dt>Estoque</dt><dd>Será atualizado automaticamente</dd></div><div><dt>Financeiro</dt><dd>{createPayables ? `${installmentCount} conta(s) a pagar serão criadas` : "Sem lançamento automático"}</dd></div></section>
            <p className="wizard-confirmation-note">Ao confirmar, a movimentação de estoque será registrada e mantida no histórico.</p>
          </>}
        </div>
        <aside className="wizard-side-summary"><div className="wizard-summary-heading"><span>Resumo</span><h3>Resumo da compra</h3></div><dl><div><dt>Itens</dt><dd>{lines.length}</dd></div><div><dt>Unidades</dt><dd>{lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0)}</dd></div><div><dt>Fornecedor</dt><dd>{suppliers.find(supplier => supplier.id === supplierId)?.name ?? "A definir"}</dd></div><div><dt>Frete</dt><dd>{money(Number(freight || 0))}</dd></div><div><dt>Pagamento</dt><dd>{createPayables ? `${installmentCount}x a prazo` : "Não informado"}</dd></div></dl><div className="wizard-summary"><span>Total estimado</span><strong>{money(total)}</strong></div><p>{createPayables ? "As parcelas serão criadas ao confirmar o recebimento." : "O custo final será calculado ao confirmar o recebimento."}</p></aside>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="wizard-actions">{step > 0 ? <button className="button button-secondary" type="button" onClick={() => setStep(current => current - 1)}>← Voltar</button> : <button className="button button-secondary" type="button" onClick={close}>Cancelar</button>}{step < 2 ? <button key="purchase-next-step" className="button button-primary" type="button" onClick={event => { event.preventDefault(); nextStep(); }}>Continuar →</button> : <button key="purchase-submit" className="button button-primary" type="submit" disabled={pending}>{pending ? "Registrando…" : "Confirmar recebimento"}</button>}</div>
    </form>
  </section>;
}

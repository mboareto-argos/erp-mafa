"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/layout/app-icon";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SelectField } from "@/components/ui/select-field";

type Account = { id: string; name: string; status: string };
const categories = [
  ["mercadorias", "Mercadorias"],
  ["frete", "Frete"],
  ["embalagem", "Embalagem"],
  ["publicidade", "Publicidade"],
  ["plataforma", "Plataforma"],
  ["telefone", "Telefone"],
  ["internet", "Internet"],
  ["aluguel", "Aluguel"],
  ["energia", "Energia"],
  ["transporte", "Transporte"],
  ["combustivel", "Combustível"],
  ["taxa", "Taxa"],
  ["imposto", "Imposto"],
  ["manutencao", "Manutenção"],
  ["pro_labore", "Pró-labore"],
  ["retirada", "Retirada"],
  ["despesa_administrativa", "Despesa administrativa"],
  ["perda", "Perda"],
  ["outra", "Outra"],
];

export function ExpenseForm({
  accounts,
  initialOpen = false,
}: {
  accounts: Account[];
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [paidNow, setPaidNow] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [key] = useState(() => crypto.randomUUID());
  const today = new Date().toISOString().slice(0, 10);
  function close() {
    setOpen(false);
    router.replace("/financeiro?tab=expenses", { scroll: false });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({
          description: data.get("description"),
          category: data.get("category"),
          amount: Number(data.get("amount")),
          competenceDate: data.get("competenceDate"),
          paidNow,
          financialAccountId: paidNow
            ? data.get("account") || undefined
            : undefined,
          dueDate: paidNow ? undefined : data.get("dueDate"),
          installmentCount: paidNow
            ? 1
            : Number(data.get("installmentCount") || 1),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(
          body.message ?? "Não foi possível registrar a despesa.",
        );
      close();
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível registrar a despesa.",
      );
    } finally {
      setPending(false);
    }
  }
  if (!open)
    return (
      <button
        className="button button-primary compact-button"
        type="button"
        onClick={() => setOpen(true)}
      >
        Nova despesa
      </button>
    );
  return (
    <section className="wizard-card finance-entry-workspace">
      <div className="wizard-heading">
        <div>
          <button className="wizard-back-link" type="button" onClick={close}>
            ← Voltar para despesas
          </button>
          <h2>Nova despesa</h2>
          <p>
            Registre o gasto no realizado ou crie um compromisso para pagar
            depois.
          </p>
        </div>
        <button
          className="close-button"
          type="button"
          onClick={close}
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
      <form onSubmit={submit}>
        <div className="finance-entry-layout">
          <main className="wizard-main">
            <div className="wizard-stage-heading">
              <span>1</span>
              <div>
                <h3>Como esta despesa será paga?</h3>
                <p>
                  Essa escolha define se o valor entra no caixa realizado ou
                  previsto.
                </p>
              </div>
            </div>
            <div className="finance-payment-choice">
              <label className={paidNow ? "selected" : ""}>
                <input
                  type="radio"
                  name="paymentMoment"
                  checked={paidNow}
                  onChange={() => setPaidNow(true)}
                />
                <span className="payment-radio" />
                <span>
                  <strong>Já paguei</strong>
                  <small>Cria uma saída no caixa realizado agora.</small>
                </span>
              </label>
              <label className={!paidNow ? "selected" : ""}>
                <input
                  type="radio"
                  name="paymentMoment"
                  checked={!paidNow}
                  onChange={() => setPaidNow(false)}
                />
                <span className="payment-radio" />
                <span>
                  <strong>Vou pagar depois</strong>
                  <small>Cria uma conta a pagar no caixa previsto.</small>
                </span>
              </label>
            </div>
            <section className="wizard-form-section">
              <h4>Dados da despesa</h4>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="expense-description">Descrição</label>
                  <input
                    id="expense-description"
                    name="description"
                    required
                    maxLength={500}
                    placeholder="Ex.: campanha de anúncios do mês"
                  />
                </div>
                <SelectField
                  label="Categoria"
                  name="category"
                  defaultValue="outra"
                >
                  {categories.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
                <CurrencyInput
                  label="Valor"
                  name="amount"
                  required
                  min={0.01}
                />
                <div className="field">
                  <label htmlFor="expense-competence">Competência</label>
                  <input
                    id="expense-competence"
                    name="competenceDate"
                    type="date"
                    defaultValue={today}
                    required
                  />
                </div>
                {paidNow ? (
                  <SelectField
                    label="Conta de saída"
                    name="account"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Selecione a conta
                    </option>
                    {accounts
                      .filter((account) => account.status === "active")
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </SelectField>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="expense-due">Primeiro vencimento</label>
                    <input id="expense-due" name="dueDate" type="date" min={today} required />
                  </div>
                  <div className="field">
                    <label htmlFor="expense-installments">Parcelas</label>
                    <input id="expense-installments" name="installmentCount" type="number" min="1" max="60" defaultValue="1" required />
                    <small>Os próximos vencimentos serão mensais.</small>
                  </div>
                </>
              )}
              </div>
            </section>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </main>
          <aside className="wizard-side-summary">
            <div className="wizard-summary-heading">
              <span>Efeito da operação</span>
              <h3>{paidNow ? "Caixa realizado" : "Caixa previsto"}</h3>
            </div>
            <div className={`sale-detail-state ${paidNow ? "" : "draft"}`}>
              <AppIcon name="finance" />
              <p>
                {paidNow
                  ? "Uma saída será criada na conta selecionada e a despesa passará a compor o resultado realizado."
                  : "As parcelas serão criadas como contas a pagar. Nenhuma saída acontecerá até registrar cada pagamento."}
              </p>
            </div>
            <p>
              Competência indica a qual período econômico a despesa pertence;
              pagamento indica quando o dinheiro realmente saiu.
            </p>
          </aside>
        </div>
        <div className="wizard-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={close}
          >
            Cancelar
          </button>
          <button
            className="button button-primary compact-button"
            disabled={pending}
          >
            {pending ? "Registrando…" : "Registrar despesa"}
          </button>
        </div>
      </form>
    </section>
  );
}

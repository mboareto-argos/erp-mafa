"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Account = { id: string; name: string; status: string };
type OpenItem = { id: string; description: string; amountOriginal: string; amountApplied: string; dueDate: string; status: string; isOverdue?: boolean };

const money = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));

function SettlementForm({ kind, item, accounts, onClose }: { kind: "receivables" | "payables"; item: OpenItem; accounts: Account[]; onClose: () => void }) {
  const router = useRouter();
  const remaining = Number(item.amountOriginal) - Number(item.amountApplied);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true); setError(undefined);
    try {
      const response = await fetch(`/api/finance/${kind}/${item.id}/pay`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ financialAccountId: values.get("account"), amount: Number(values.get("amount")), interest: Number(values.get("interest") || 0), discount: Number(values.get("discount") || 0) }) });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "Não foi possível registrar a baixa.");
      onClose(); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar a baixa."); } finally { setPending(false); }
  }
  return <section className="form-card settlement-form"><div className="form-card-heading"><div><h2>{kind === "receivables" ? "Receber valor" : "Pagar conta"}</h2><p>{item.description} · saldo de {money(String(remaining))}</p></div><button className="close-button" onClick={onClose} aria-label="Fechar">×</button></div><form onSubmit={submit}><div className="form-grid"><div className="field"><label>Conta financeira<select name="account" required defaultValue=""><option value="" disabled>Selecione</option>{accounts.filter(account => account.status === "active").map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div><div className="field"><label>Valor aplicado (R$)<input name="amount" type="number" min="0.01" max={remaining} step="0.01" defaultValue={remaining.toFixed(2)} required /></label></div><div className="field"><label>Juros (R$)<input name="interest" type="number" min="0" step="0.01" defaultValue="0" /></label></div><div className="field"><label>Desconto (R$)<input name="discount" type="number" min="0" step="0.01" defaultValue="0" /></label></div></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary compact-button" disabled={pending}>{pending ? "Salvando…" : kind === "receivables" ? "Confirmar recebimento" : "Confirmar pagamento"}</button></form></section>;
}

export function OpenItems({ title, kind, items, accounts, canManage }: { title: string; kind: "receivables" | "payables"; items: OpenItem[]; accounts: Account[]; canManage: boolean }) {
  const [selected, setSelected] = useState<OpenItem>();
  const open = items.filter(item => !["received", "paid", "cancelled"].includes(item.status));
  return <section className="data-card"><h2 className="section-heading">{title}</h2>{selected && <SettlementForm kind={kind} item={selected} accounts={accounts} onClose={() => setSelected(undefined)} />}{open.length === 0 ? <p className="inline-empty">Nenhuma conta em aberto.</p> : <div className="table-wrap"><table><thead><tr><th>Descrição</th><th>Vencimento</th><th className="number">Saldo</th>{canManage && <th>Ação</th>}</tr></thead><tbody>{open.map(item => { const remaining = Number(item.amountOriginal) - Number(item.amountApplied); return <tr key={item.id}><td data-label="Descrição"><strong>{item.description}</strong><span className={`status-badge ${item.isOverdue ? "cancelled" : "pending"}`}>{item.isOverdue ? "Vencida" : "Em aberto"}</span></td><td data-label="Vencimento">{date(item.dueDate)}</td><td data-label="Saldo" className="number">{money(String(remaining))}</td>{canManage && <td data-label="Ação"><button className="button button-secondary compact-button" onClick={() => setSelected(item)}>{kind === "receivables" ? "Receber" : "Pagar"}</button></td>}</tr>; })}</tbody></table></div>}</section>;
}

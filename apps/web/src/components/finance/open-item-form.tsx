"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OpenItemForm({ kind }: { kind: "receivables" | "payables" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const label = kind === "receivables" ? "conta a receber" : "conta a pagar";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget); setPending(true); setError(undefined);
    try { const response = await fetch(`/api/finance/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: values.get("description"), amountOriginal: Number(values.get("amount")), dueDate: values.get("dueDate") }) }); const data = await response.json() as { message?: string }; if (!response.ok) throw new Error(data.message || `Não foi possível criar a ${label}.`); setOpen(false); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : `Não foi possível criar a ${label}.`); } finally { setPending(false); }
  }
  if (!open) return <button className="button button-secondary compact-button" onClick={() => setOpen(true)}>Nova {label}</button>;
  return <section className="form-card"><div className="form-card-heading"><div><h2>Nova {label}</h2><p>Registre um compromisso ou cobrança futura.</p></div><button className="close-button" onClick={() => setOpen(false)} aria-label="Fechar">×</button></div><form onSubmit={submit}><div className="form-grid"><div className="field"><label>Descrição<input name="description" required /></label></div><div className="field"><label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" required /></label></div><div className="field"><label>Vencimento<input name="dueDate" type="date" required /></label></div></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary compact-button" disabled={pending}>{pending ? "Salvando…" : `Salvar ${label}`}</button></form></section>;
}

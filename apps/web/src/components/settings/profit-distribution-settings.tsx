"use client";

import { useState } from "react";

type Policy = { effectiveFrom: string; reinvestmentRate: string; proLaboreRate: string; reserveRate: string; marketingRate: string };

export function ProfitDistributionSettings({ policy, canManage }: { policy?: Policy; canManage: boolean }) {
  const [pending, setPending] = useState(false); const [message, setMessage] = useState<string>(); const [error, setError] = useState<string>();
  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(undefined); setMessage(undefined); const data = new FormData(event.currentTarget);
    const body = { effectiveFrom: data.get("effectiveFrom"), reinvestmentRate: Number(data.get("reinvestmentRate")), proLaboreRate: Number(data.get("proLaboreRate")), reserveRate: Number(data.get("reserveRate")), marketingRate: Number(data.get("marketingRate")) };
    const total = body.reinvestmentRate + body.proLaboreRate + body.reserveRate + body.marketingRate;
    if (Math.abs(total - 100) > 0.001) { setError("A soma das quatro destinações deve ser exatamente 100%."); setPending(false); return; }
    try { const response = await fetch("/api/settings/company/profit-distribution", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json() as { message?: string }; if (!response.ok) throw new Error(result.message ?? "Não foi possível salvar a política."); setMessage("Política salva. Ela será aplicada à DRE a partir do período informado."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a política."); } finally { setPending(false); }
  }
  return <form className="settings-company-form" onSubmit={submit}><section className="wizard-form-section"><h3>Distribuição do lucro</h3><p className="section-description">Aplicada somente depois do resultado líquido positivo; estes valores não são despesas operacionais.</p><div className="form-grid"><div className="field"><label htmlFor="profit-effective">Válida a partir de</label><input id="profit-effective" name="effectiveFrom" type="date" defaultValue={policy?.effectiveFrom.slice(0, 10) ?? currentMonth} required disabled={!canManage} /></div><div className="field"><label htmlFor="profit-reinvestment">Reinvestimento (%)</label><input id="profit-reinvestment" name="reinvestmentRate" type="number" min="0" max="100" step="0.01" defaultValue={policy?.reinvestmentRate ?? "60"} required disabled={!canManage} /></div><div className="field"><label htmlFor="profit-pro-labore">Pró-labore (%)</label><input id="profit-pro-labore" name="proLaboreRate" type="number" min="0" max="100" step="0.01" defaultValue={policy?.proLaboreRate ?? "25"} required disabled={!canManage} /></div><div className="field"><label htmlFor="profit-reserve">Reserva (%)</label><input id="profit-reserve" name="reserveRate" type="number" min="0" max="100" step="0.01" defaultValue={policy?.reserveRate ?? "10"} required disabled={!canManage} /></div><div className="field"><label htmlFor="profit-marketing">Marketing/investimento (%)</label><input id="profit-marketing" name="marketingRate" type="number" min="0" max="100" step="0.01" defaultValue={policy?.marketingRate ?? "5"} required disabled={!canManage} /></div></div></section>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}{canManage && <div className="wizard-actions"><button className="button button-primary compact-button" disabled={pending}>{pending ? "Salvando…" : "Salvar distribuição"}</button></div>}</form>;
}

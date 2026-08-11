'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Company = { companyId: string; companyName: string; roleName: string };

const roleLabels: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  sales: 'Vendedor',
  inventory: 'Estoquista',
  finance: 'Financeiro',
  viewer: 'Visualizador',
};

export function CompanySelector() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();

  useEffect(() => {
    async function restoreCompanies() {
      const stored = sessionStorage.getItem('erp_mafa_companies');
      if (!stored) {
        router.replace('/entrar');
        return;
      }
      try {
        setCompanies(JSON.parse(stored) as Company[]);
      } catch {
        router.replace('/entrar');
      }
    }
    void restoreCompanies();
  }, [router]);

  async function select(companyId: string) {
    setError(undefined);
    setPendingId(companyId);
    try {
      const response = await fetch('/api/session/select-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          result.message ?? 'Não foi possível selecionar a empresa.',
        );
      sessionStorage.removeItem('erp_mafa_companies');
      router.replace('/inicio');
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível selecionar a empresa.',
      );
      setPendingId(undefined);
    }
  }

  if (!companies) return <p aria-live="polite">Carregando suas empresas…</p>;
  return (
    <>
      <div className="company-list">
        {companies.map((company) => (
          <button
            className="company-option"
            key={company.companyId}
            onClick={() => select(company.companyId)}
            disabled={Boolean(pendingId)}
          >
            <strong>{company.companyName}</strong>
            <span>
              {pendingId === company.companyId
                ? 'Entrando…'
                : (roleLabels[company.roleName] ?? company.roleName)}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

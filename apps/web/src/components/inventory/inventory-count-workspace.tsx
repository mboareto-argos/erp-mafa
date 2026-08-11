'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppIcon } from '@/components/layout/app-icon';

export type InventoryCount = {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    expectedQuantity: string;
    countedQuantity: string | null;
    productVariant: {
      skuVariant: string;
      product: { name: string; unit?: string };
    };
  }>;
};
export function InventoryCountWorkspace({
  counts,
  active,
  canAdjust,
}: {
  counts: InventoryCount[];
  active?: InventoryCount;
  canAdjust: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (active?.items ?? []).map((item) => [
        item.id,
        item.countedQuantity ?? '',
      ]),
    ),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function create() {
    setPending(true);
    try {
      const response = await fetch('/api/inventory/counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const result = (await response.json()) as {
        id?: string;
        message?: string;
      };
      if (!response.ok || !result.id)
        throw new Error(result.message ?? 'Não foi possível iniciar.');
      router.push(`/estoque?inventory=${result.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível iniciar.',
      );
    } finally {
      setPending(false);
    }
  }
  async function save(complete = false) {
    if (!active) return;
    const items = active.items.map((item) => ({
      itemId: item.id,
      countedQuantity: Number(values[item.id]),
    }));
    if (
      items.some(
        (item) =>
          !Number.isFinite(item.countedQuantity) || item.countedQuantity < 0,
      )
    )
      return setError('Informe a contagem de todos os produtos.');
    setPending(true);
    setError(undefined);
    try {
      const saved = await fetch(`/api/inventory/counts/${active.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const payload = (await saved.json()) as { message?: string };
      if (!saved.ok)
        throw new Error(payload.message ?? 'Não foi possível salvar.');
      if (complete) {
        const done = await fetch(
          `/api/inventory/counts/${active.id}/complete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          },
        );
        const result = (await done.json()) as { message?: string };
        if (!done.ok)
          throw new Error(result.message ?? 'Não foi possível concluir.');
        router.push('/estoque');
      } else router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível salvar.',
      );
    } finally {
      setPending(false);
    }
  }
  if (!active)
    return (
      <div className="inventory-count-actions">
        {canAdjust && (
          <button
            className="button button-secondary compact-button"
            type="button"
            onClick={create}
            disabled={pending}
          >
            <AppIcon name="inventory" />
            {pending ? 'Iniciando…' : 'Novo inventário'}
          </button>
        )}
        {counts.some((count) => count.status === 'draft') && (
          <a
            className="text-link"
            href={`/estoque?inventory=${counts.find((count) => count.status === 'draft')!.id}`}
          >
            Continuar inventário em andamento
          </a>
        )}
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  return (
    <section className="form-card wizard-card inventory-count-workspace">
      <header className="wizard-heading">
        <div>
          <span className="wizard-eyebrow">Conferência física</span>
          <h2>Inventário #{active.id.slice(0, 8)}</h2>
          <p>Conte cada produto. Nenhum saldo muda até você concluir.</p>
        </div>
        <button
          className="close-button"
          onClick={() => router.push('/estoque')}
        >
          ×
        </button>
      </header>
      <div className="inventory-count-summary">
        <strong>{active.items.length} produtos</strong>
        <span>
          {Object.values(values).filter((value) => value !== '').length}{' '}
          contados
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>SKU</th>
              <th className="number">Esperado</th>
              <th className="number">Contado</th>
              <th className="number">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {active.items.map((item) => {
              const counted = values[item.id];
              const difference =
                counted === ''
                  ? undefined
                  : Number(counted) - Number(item.expectedQuantity);
              return (
                <tr key={item.id}>
                  <td data-label="Produto">
                    <strong>{item.productVariant.product.name}</strong>
                  </td>
                  <td data-label="SKU">{item.productVariant.skuVariant}</td>
                  <td className="number" data-label="Esperado">
                    {item.expectedQuantity}
                  </td>
                  <td data-label="Contado">
                    <input
                      className="inventory-count-input"
                      aria-label={`Contagem de ${item.productVariant.product.name}`}
                      type="number"
                      min="0"
                      step="0.001"
                      value={counted}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                  </td>
                  <td
                    className={`number${difference && difference !== 0 ? ' movement-quantity negative' : ''}`}
                    data-label="Diferença"
                  >
                    {difference === undefined
                      ? '—'
                      : difference > 0
                        ? `+${difference}`
                        : difference}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="wizard-actions">
        <button
          className="button button-secondary"
          onClick={() => save(false)}
          disabled={pending}
        >
          Salvar contagem
        </button>
        <button
          className="button button-primary"
          onClick={() => save(true)}
          disabled={pending}
        >
          {pending ? 'Concluindo…' : 'Aprovar ajustes e concluir'}
        </button>
      </div>
    </section>
  );
}

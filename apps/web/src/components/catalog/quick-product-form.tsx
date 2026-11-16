'use client';

import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { CatalogProduct } from '@/lib/catalog';
import { centsToDecimal, toCents } from '@/lib/money';

const inputClass =
  'h-11 rounded-md border border-neutral-200 px-3 text-md font-normal text-neutral-900 focus:border-brand-accent focus:outline-none';

// Cadastro mínimo de produto dentro de outro fluxo (ex.: a compra que acabou
// de chegar): nome, código e preço de venda. Categoria, marca e estoque
// mínimo se completam depois em Produtos. Custo nunca é digitado aqui — ele
// nasce do recebimento da compra (DS-FORM-004).
export function QuickProductForm({
  initialName = '',
  initialSku = '',
  onCreated,
  onCancel,
}: {
  initialName?: string;
  initialSku?: string;
  onCreated: (product: CatalogProduct) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [sku, setSku] = useState(initialSku);
  const [priceCents, setPriceCents] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{
    field?: 'name' | 'sku';
    message: string;
  }>();

  async function create() {
    if (!name.trim())
      return setError({ field: 'name', message: 'Informe o nome do produto.' });
    if (!sku.trim())
      return setError({
        field: 'sku',
        message: 'Informe o código (pode ser o código de barras).',
      });
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch('/api/catalog/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim(),
          unit: 'un',
          ...(priceCents > 0
            ? { salePrice: Number(centsToDecimal(priceCents)) }
            : {}),
        }),
      });
      const body = (await response.json()) as CatalogProduct & {
        message?: string;
      };
      if (!response.ok || !body.id) {
        const message = body.message ?? 'Não foi possível cadastrar o produto.';
        throw Object.assign(new Error(message), {
          field: /SKU|código/i.test(message) ? 'sku' : undefined,
        });
      }
      onCreated(body);
    } catch (cause) {
      const field = (cause as { field?: 'sku' }).field;
      setError({
        field,
        message:
          cause instanceof Error
            ? cause.message
            : 'Não foi possível cadastrar o produto.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-brand-accent bg-neutral-0 p-4">
      <strong className="text-sm font-semibold text-neutral-900">
        Novo produto
      </strong>
      <label
        className="grid gap-1 text-sm font-semibold text-neutral-700"
        htmlFor={`${id}-name`}
      >
        Nome
        <input
          id={`${id}-name`}
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus={!initialName}
          autoComplete="off"
          placeholder="Ex.: Yara EDP 100 ml"
          aria-invalid={error?.field === 'name' || undefined}
          aria-describedby={error?.field === 'name' ? `${id}-error` : undefined}
        />
      </label>
      <label
        className="grid gap-1 text-sm font-semibold text-neutral-700"
        htmlFor={`${id}-sku`}
      >
        Código{' '}
        <span className="font-normal text-neutral-500">
          (código de barras ou código interno)
        </span>
        <input
          id={`${id}-sku`}
          className={inputClass}
          value={sku}
          onChange={(event) => setSku(event.target.value)}
          autoComplete="off"
          aria-invalid={error?.field === 'sku' || undefined}
          aria-describedby={error?.field === 'sku' ? `${id}-error` : undefined}
        />
      </label>
      <CurrencyInput
        label="Preço de venda (opcional)"
        value={priceCents ? centsToDecimal(priceCents) : ''}
        onValueChange={(value) => setPriceCents(toCents(value))}
        hint="Dá para definir depois em Produtos."
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger-600">
          {error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="tertiary" onClick={onCancel}>
          Voltar
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={pending}
          onClick={create}
        >
          <Check aria-hidden="true" />
          Cadastrar e adicionar
        </Button>
      </div>
    </div>
  );
}

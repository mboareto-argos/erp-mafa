'use client';

import { useId, useMemo, useState } from 'react';
import { Check, UserPlus, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

export type PickerContact = {
  id: string;
  name: string;
  whatsapp?: string | null;
};

type Kind = 'customer' | 'supplier';
const TEXT: Record<
  Kind,
  {
    noun: string;
    plural: string;
    endpoint: string;
    whatsappHint: string;
    requiredHint: string;
  }
> = {
  customer: {
    noun: 'cliente',
    plural: 'Clientes',
    endpoint: '/api/customers',
    whatsappHint: 'opcional — usado para cobrar o fiado',
    requiredHint: 'obrigatório no fiado',
  },
  supplier: {
    noun: 'fornecedor',
    plural: 'Fornecedores',
    endpoint: '/api/purchasing/suppliers',
    whatsappHint: 'opcional',
    requiredHint: 'obrigatório na compra a prazo',
  },
};

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Escolher o cliente/fornecedor sem sair da venda ou da compra — e
// cadastrar ali mesmo quando ele ainda não existe (antes era preciso ir na
// tela de cadastro e voltar). O cadastro rápido pede só nome e WhatsApp; o
// resto se completa depois na tela própria.
export function ContactPicker({
  kind,
  contacts: customers,
  value,
  onChange,
  onCreated,
  canCreate,
  required,
}: {
  kind: Kind;
  contacts: PickerContact[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (contact: PickerContact) => void;
  canCreate: boolean;
  required?: boolean;
}) {
  const id = useId();
  const text = TEXT[kind];
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const selected = customers.find((customer) => customer.id === value);
  const matches = useMemo(() => {
    const q = normalize(query);
    const list = q
      ? customers.filter((customer) => normalize(customer.name).includes(q))
      : customers;
    return list.slice(0, 6);
  }, [customers, query]);

  async function create() {
    if (!name.trim()) return setError(`Informe o nome do ${text.noun}.`);
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(text.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ...(whatsapp.trim() ? { whatsapp: whatsapp.trim() } : {}),
        }),
      });
      const body = (await response.json()) as PickerContact & {
        message?: string;
      };
      if (!response.ok || !body.id)
        throw new Error(
          body.message ?? `Não foi possível cadastrar o ${text.noun}.`,
        );
      onCreated(body);
      onChange(body.id);
      setCreating(false);
      setQuery('');
      setName('');
      setWhatsapp('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Não foi possível cadastrar o ${text.noun}.`,
      );
    } finally {
      setPending(false);
    }
  }

  if (selected)
    return (
      <div className="flex min-h-14 items-center gap-3 rounded-lg border border-brand-accent bg-brand-accent-subtle px-3">
        <span className="grid size-9 place-items-center rounded-full bg-neutral-0 text-brand-accent-hover">
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-md font-semibold text-neutral-900">
            {selected.name}
          </strong>
          {selected.whatsapp && (
            <span className="block truncate text-sm text-neutral-500">
              {selected.whatsapp}
            </span>
          )}
        </span>
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          onClick={() => onChange('')}
          aria-label={`Trocar ${text.noun} (${selected.name})`}
        >
          <X aria-hidden="true" />
          Trocar
        </Button>
      </div>
    );

  if (creating)
    return (
      <div className="grid gap-3 rounded-lg border border-neutral-100 bg-neutral-0 p-3">
        <strong className="text-sm font-semibold text-neutral-900">
          Novo {text.noun}
        </strong>
        <label
          className="grid gap-1 text-sm font-semibold text-neutral-700"
          htmlFor={`${id}-name`}
        >
          Nome
          <input
            id={`${id}-name`}
            className="h-11 rounded-md border border-neutral-200 px-3 text-md font-normal text-neutral-900 focus:border-brand-accent focus:outline-none"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            autoComplete="off"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </label>
        <label
          className="grid gap-1 text-sm font-semibold text-neutral-700"
          htmlFor={`${id}-whatsapp`}
        >
          WhatsApp{' '}
          <span className="font-normal text-neutral-500">
            ({text.whatsappHint})
          </span>
          <input
            id={`${id}-whatsapp`}
            className="h-11 rounded-md border border-neutral-200 px-3 text-md font-normal text-neutral-900 focus:border-brand-accent focus:outline-none"
            value={whatsapp}
            onChange={(event) => setWhatsapp(formatPhone(event.target.value))}
            inputMode="tel"
            autoComplete="off"
            placeholder="(11) 99999-0000"
          />
        </label>
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-sm text-danger-600"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="tertiary"
            onClick={() => setCreating(false)}
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            onClick={create}
          >
            <Check aria-hidden="true" />
            Cadastrar e usar
          </Button>
        </div>
      </div>
    );

  return (
    <div className="grid gap-2">
      <label className="sr-only" htmlFor={`${id}-search`}>
        Buscar {text.noun}
      </label>
      <input
        id={`${id}-search`}
        type="search"
        className="h-12 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-md text-neutral-900 focus:border-brand-accent focus:outline-none"
        placeholder={
          required
            ? `Buscar ${text.noun} (${text.requiredHint})`
            : `Buscar ${text.noun} pelo nome`
        }
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
      />
      <ul className="grid gap-1" aria-label={`${text.plural} encontrados`}>
        {matches.map((customer) => (
          <li key={customer.id}>
            <button
              type="button"
              onClick={() => onChange(customer.id)}
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-brand-accent"
            >
              <UserRound
                className="size-5 shrink-0 text-neutral-300"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-md text-neutral-900">
                {customer.name}
              </span>
            </button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-3 py-2 text-sm text-neutral-500">
            Nenhum {text.noun} com &quot;{query}&quot;.
          </li>
        )}
      </ul>
      {canCreate && (
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setName(query);
            setError(undefined);
          }}
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-md border border-dashed border-neutral-200 px-3 text-sm font-semibold text-brand-accent-hover hover:bg-brand-accent-subtle',
          )}
        >
          <UserPlus className="size-5" aria-hidden="true" />
          {query.trim()
            ? `Cadastrar "${query.trim()}"`
            : `Cadastrar novo ${text.noun}`}
        </button>
      )}
    </div>
  );
}

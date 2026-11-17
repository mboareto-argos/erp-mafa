'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { notify } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

type KeyType = 'cnpj' | 'cpf' | 'phone' | 'email' | 'random';

const KEY_TYPES: { value: KeyType; label: string; placeholder: string }[] = [
  { value: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  { value: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
  { value: 'phone', label: 'Celular', placeholder: '(11) 99999-0000' },
  { value: 'email', label: 'E-mail', placeholder: 'pix@sualoja.com.br' },
  {
    value: 'random',
    label: 'Aleatória',
    placeholder: '123e4567-e89b-12d3-a456-426614174000',
  },
];

/** Adivinha o tipo da chave já salva (normalizada pela API). */
function guessType(key: string | null | undefined): KeyType {
  if (!key) return 'cnpj';
  if (key.startsWith('+')) return 'phone';
  if (key.includes('@')) return 'email';
  if (/^\d{11}$/.test(key)) return 'cpf';
  if (/^\d{14}$/.test(key)) return 'cnpj';
  return 'random';
}

const inputClass =
  'h-12 w-full rounded-md border border-neutral-200 px-3 text-md text-neutral-900 focus:border-brand-accent focus:outline-none';

/**
 * Chave Pix da forma de pagamento (BR §10.12, regra 8): usada para mostrar
 * o QR Code com o valor na venda. A API valida e normaliza a chave e registra
 * a alteração na auditoria.
 */
export function PixKeyEditor({
  methodId,
  methodName,
  pixKey,
  merchantName,
  merchantCity,
  companyName,
}: {
  methodId: string;
  methodName: string;
  pixKey?: string | null;
  merchantName?: string | null;
  merchantCity?: string | null;
  companyName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<KeyType>(guessType(pixKey));
  const [key, setKey] = useState(pixKey ?? '');
  const [name, setName] = useState(
    merchantName ?? companyName?.slice(0, 25) ?? '',
  );
  const [city, setCity] = useState(merchantCity ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const current = KEY_TYPES.find((option) => option.value === type)!;

  async function save(body: object) {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/payments/methods/${methodId}/pix`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(result.message ?? 'Não foi possível salvar.');
      notify.success('Chave Pix salva', methodName);
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tente de novo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="button button-secondary compact-button"
        onClick={() => setOpen(true)}
      >
        <QrCode className="size-4" aria-hidden="true" />
        {pixKey ? 'Chave Pix' : 'Cadastrar chave Pix'}
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-lg">
          <form
            className="grid grid-cols-1 gap-4 px-4 pb-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save({
                keyType: type,
                key,
                merchantName: name,
                merchantCity: city,
              });
            }}
          >
            <DrawerHeader className="px-0">
              <DrawerTitle>Chave Pix · {methodName}</DrawerTitle>
              <DrawerDescription>
                Com a chave, a venda em Pix mostra um QR Code com o valor certo
                para o cliente pagar. Use a chave da conta que recebe as vendas.
              </DrawerDescription>
            </DrawerHeader>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold text-neutral-700">
                Tipo de chave
              </legend>
              <div className="flex flex-wrap gap-2">
                {KEY_TYPES.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex min-h-10 cursor-pointer items-center rounded-md border px-3 text-sm font-semibold',
                      type === option.value
                        ? 'border-brand-accent bg-brand-accent-subtle text-neutral-900'
                        : 'border-neutral-200 text-neutral-700',
                    )}
                  >
                    <input
                      type="radio"
                      name="pix-key-type"
                      value={option.value}
                      checked={type === option.value}
                      onChange={() => setType(option.value)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Chave Pix
              <input
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder={current.placeholder}
                inputMode={
                  type === 'email'
                    ? 'email'
                    : type === 'random'
                      ? 'text'
                      : 'numeric'
                }
                autoComplete="off"
                className={inputClass}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Nome de quem recebe
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={25}
                className={inputClass}
              />
              <span className="text-xs font-normal text-neutral-500">
                Até 25 letras. Aparece para o cliente ao pagar.
              </span>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Cidade
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                maxLength={15}
                placeholder="Sao Paulo"
                className={inputClass}
              />
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
              >
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar chave Pix'}
            </Button>
            {pixKey && (
              <Button
                type="button"
                variant="tertiary"
                disabled={pending}
                onClick={() => save({ key: null })}
              >
                Remover chave
              </Button>
            )}
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}

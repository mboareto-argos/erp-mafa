'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeftRight,
  HandHeart,
  Landmark,
  Scale,
  Wallet,
} from 'lucide-react';
import { CalculatedBox, SummaryRow } from '@/components/flow/task-flow';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { notify } from '@/components/ui/toaster';
import { centsToDecimal, formatCents, toCents } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  reconcileDifference,
  summarizeAccounts,
  type MoneyAccount,
} from './money-math';

type Action =
  | { kind: 'opening'; account: MoneyAccount }
  | { kind: 'reconcile'; account: MoneyAccount }
  | { kind: 'reimburse' }
  | { kind: 'contribution' };

// Visão geral do Financeiro (BR §10.13 regras 8–11): quanto a loja tem de
// verdade, conta por conta, batendo com o banco; e quanto a loja deve ao
// proprietário (conta do proprietário), com reembolso ou aporte.
export function MoneyOverview({
  accounts,
  receivableCents,
  payableCents,
  overdueCount,
  canManage,
  canSeeReceivables,
  canSeePayables,
}: {
  accounts: MoneyAccount[];
  receivableCents: number;
  payableCents: number;
  overdueCount: number;
  canManage: boolean;
  canSeeReceivables: boolean;
  canSeePayables: boolean;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [creatingOwner, setCreatingOwner] = useState(false);
  const summary = summarizeAccounts(accounts);

  async function createOwnerAccount() {
    setCreatingOwner(true);
    try {
      const response = await fetch('/api/financial-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Meu bolso', kind: 'owner' }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? 'Não foi possível criar a conta.');
      notify.success(
        'Conta "Meu bolso" criada',
        'Use "Do meu bolso" ao pagar despesas e compras da loja.',
      );
      router.refresh();
    } catch (cause) {
      notify.error(
        'Não foi possível criar a conta',
        cause instanceof Error ? cause.message : undefined,
      );
    } finally {
      setCreatingOwner(false);
    }
  }

  return (
    <div className="grid gap-4">
      <section
        aria-labelledby="store-money"
        className="grid gap-3 rounded-lg border border-neutral-100 bg-neutral-0 p-4 shadow-sm"
      >
        <div>
          <h2
            id="store-money"
            className="flex items-center gap-1.5 text-sm text-neutral-500"
          >
            <Wallet
              className="size-4 text-brand-accent-hover"
              aria-hidden="true"
            />
            Dinheiro da loja hoje
          </h2>
          <strong
            className={cn(
              'block text-3xl font-bold tabular-nums sm:text-display',
              summary.storeCents < 0 ? 'text-danger-600' : 'text-neutral-900',
            )}
          >
            {formatCents(summary.storeCents)}
          </strong>
          <p className="text-xs text-neutral-500">
            Soma{' '}
            {summary.store.length === 1
              ? 'da conta'
              : `das ${summary.store.length} contas`}{' '}
            da loja · caixa realizado
            {summary.owner ? ' · não inclui o seu bolso' : ''}
          </p>
        </div>

        {summary.missingOpening.length > 0 && (
          <p
            className="flex gap-2 rounded-md bg-warning-50 px-3 py-2 text-sm text-neutral-900"
            role="status"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-warning-600"
              aria-hidden="true"
            />
            <span>
              {summary.missingOpening.length === 1
                ? `A conta ${summary.missingOpening[0].name} ainda não tem saldo inicial`
                : `${summary.missingOpening.length} contas ainda não têm saldo inicial`}
              : o valor só bate com o banco depois de informar.
            </span>
          </p>
        )}

        <ul className="divide-y divide-neutral-100" aria-label="Contas da loja">
          {summary.store.map((account) => (
            <li
              key={account.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3"
            >
              <Landmark
                className="size-5 shrink-0 text-neutral-300"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold text-neutral-900">
                  {account.name}
                </strong>
                {!account.hasOpeningBalance && (
                  <span className="text-xs text-warning-600">
                    Sem saldo inicial
                  </span>
                )}
              </span>
              <strong
                className={cn(
                  'shrink-0 text-md tabular-nums',
                  toCents(account.balance) < 0
                    ? 'text-danger-600'
                    : 'text-neutral-900',
                )}
              >
                {formatCents(toCents(account.balance))}
              </strong>
              {canManage && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    setAction({
                      kind: account.hasOpeningBalance ? 'reconcile' : 'opening',
                      account,
                    })
                  }
                >
                  {account.hasOpeningBalance ? (
                    <>
                      <Scale aria-hidden="true" />
                      Conferir com o banco
                    </>
                  ) : (
                    'Informar saldo inicial'
                  )}
                </Button>
              )}
            </li>
          ))}
          {summary.store.length === 0 && (
            <li className="py-3 text-sm text-neutral-500">
              Nenhuma conta da loja ainda. Cadastre em Financeiro →
              Configurações.
            </li>
          )}
        </ul>
      </section>

      {summary.owner ? (
        <section
          aria-labelledby="owner-money"
          className="grid gap-3 rounded-lg border border-neutral-100 bg-neutral-0 p-4 shadow-sm"
        >
          <h2
            id="owner-money"
            className="flex items-center gap-1.5 text-sm text-neutral-500"
          >
            <HandHeart
              className="size-4 text-brand-accent-hover"
              aria-hidden="true"
            />
            Seu bolso ({summary.owner.name})
          </h2>
          {summary.owedToOwnerCents > 0 ? (
            <>
              <p className="text-sm text-neutral-700">
                A loja te deve{' '}
                <strong className="block text-2xl font-bold text-neutral-900 tabular-nums">
                  {formatCents(summary.owedToOwnerCents)}
                </strong>
                pelo que você pagou do seu bolso.
              </p>
              {canManage && (
                <div className="grid gap-2 sm:flex">
                  <Button
                    type="button"
                    onClick={() => setAction({ kind: 'reimburse' })}
                  >
                    <ArrowLeftRight aria-hidden="true" />
                    Reembolsar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setAction({ kind: 'contribution' })}
                  >
                    Virou aporte
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-700">
              A loja não te deve nada agora.
            </p>
          )}
        </section>
      ) : (
        canManage && (
          <section className="grid gap-3 rounded-lg border border-dashed border-neutral-200 p-4 sm:flex sm:items-center">
            <HandHeart
              className="hidden size-6 shrink-0 text-brand-accent-hover sm:block"
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 text-sm text-neutral-700">
              <strong className="block text-neutral-900">
                Paga coisas da loja do seu bolso?
              </strong>
              Crie a conta &quot;Meu bolso&quot;: o gasto entra no lucro da
              loja, mas fica fora do dinheiro da loja, e você vê quanto a loja
              te deve.
            </p>
            <Button
              type="button"
              variant="secondary"
              loading={creatingOwner}
              onClick={createOwnerAccount}
            >
              Criar &quot;Meu bolso&quot;
            </Button>
          </section>
        )
      )}

      {(canSeeReceivables || canSeePayables) && (
        <section aria-label="Previsto" className="grid grid-cols-2 gap-3">
          {canSeeReceivables && (
            <Link
              href="/financeiro/quem-me-deve"
              className="grid gap-1 rounded-lg border border-neutral-100 bg-neutral-0 p-3 hover:border-brand-accent"
            >
              <span className="text-xs text-neutral-500">
                Vai entrar (a receber)
              </span>
              <strong className="text-lg font-bold text-success-600 tabular-nums">
                {formatCents(receivableCents)}
              </strong>
              <span className="text-xs text-neutral-500">Ver quem me deve</span>
            </Link>
          )}
          {canSeePayables && (
            <Link
              href="/financeiro?tab=payables"
              className="grid gap-1 rounded-lg border border-neutral-100 bg-neutral-0 p-3 hover:border-brand-accent"
            >
              <span className="text-xs text-neutral-500">
                Vai sair (a pagar)
              </span>
              <strong className="text-lg font-bold text-neutral-900 tabular-nums">
                {formatCents(payableCents)}
              </strong>
              <span className="text-xs text-neutral-500">
                {overdueCount > 0
                  ? `${overdueCount} vencido(s)`
                  : 'Nada vencido'}
              </span>
            </Link>
          )}
        </section>
      )}

      <ActionDrawer
        action={action}
        storeAccounts={summary.store}
        owner={summary.owner}
        owedCents={summary.owedToOwnerCents}
        onClose={() => setAction(null)}
      />
    </div>
  );
}

function SignedMoney({
  label,
  cents,
  onChange,
  negativeLabel,
  hint,
}: {
  label: string;
  cents: number;
  onChange: (cents: number) => void;
  negativeLabel: string;
  hint?: string;
}) {
  const negative = cents < 0;
  return (
    <div className="grid gap-2">
      <CurrencyInput
        label={label}
        value={cents ? centsToDecimal(Math.abs(cents)) : ''}
        onValueChange={(value) =>
          onChange((negative ? -1 : 1) * toCents(value))
        }
        hint={hint}
      />
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={negative}
          onChange={(event) =>
            onChange((event.target.checked ? -1 : 1) * Math.abs(cents))
          }
        />
        {negativeLabel}
      </label>
    </div>
  );
}

function ActionDrawer({
  action,
  storeAccounts,
  owner,
  owedCents,
  onClose,
}: {
  action: Action | null;
  storeAccounts: MoneyAccount[];
  owner: MoneyAccount | null;
  owedCents: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [cents, setCents] = useState(0);
  const [reason, setReason] = useState('');
  const [fromId, setFromId] = useState('');
  const [key, setKey] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [current, setCurrent] = useState<Action | null>(null);

  // Reinicia o formulário a cada ação aberta.
  if (action !== current) {
    setCurrent(action);
    setCents(
      action?.kind === 'reimburse' || action?.kind === 'contribution'
        ? owedCents
        : 0,
    );
    setReason('');
    setFromId(storeAccounts.length === 1 ? storeAccounts[0].id : '');
    setKey(undefined);
    setError(undefined);
  }

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentCents =
    action && 'account' in action ? toCents(action.account.balance) : 0;
  const difference = reconcileDifference(currentCents, cents);

  async function post(url: string, body: object, idempotent = false) {
    const idempotencyKey = idempotent
      ? (key ?? crypto.randomUUID())
      : undefined;
    if (idempotencyKey) setKey(idempotencyKey);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    if (!response.ok) {
      setKey(undefined);
      throw new Error(result.message ?? 'Não foi possível concluir.');
    }
  }

  async function submit() {
    if (!action) return;
    setError(undefined);
    const amount = Number(centsToDecimal(cents));
    if (action.kind === 'opening' && cents === 0)
      return setError('Informe o saldo que a conta tinha.');
    if (
      action.kind === 'reconcile' &&
      reason.trim().length < 3 &&
      difference !== 0
    )
      return setError('Explique o motivo da diferença (ex.: tarifa do banco).');
    if (
      (action.kind === 'reimburse' || action.kind === 'contribution') &&
      cents <= 0
    )
      return setError('Informe um valor maior que zero.');
    if (action.kind === 'contribution' && cents > owedCents)
      return setError(`O aporte não pode passar de ${formatCents(owedCents)}.`);
    if (action.kind === 'reimburse' && !fromId)
      return setError('Escolha de qual conta da loja sai o reembolso.');
    setPending(true);
    try {
      if (action.kind === 'opening') {
        await post(
          `/api/financial-accounts/${action.account.id}/opening-balance`,
          { amount, date: todayIso },
        );
        notify.success(
          'Saldo inicial registrado',
          `${action.account.name}: ${formatCents(cents)}`,
        );
      } else if (action.kind === 'reconcile') {
        await post(`/api/financial-accounts/${action.account.id}/reconcile`, {
          actualBalance: amount,
          reason: reason.trim() || 'Saldo conferido',
          date: todayIso,
        });
        notify.success(
          difference === 0 ? 'Saldo conferido: está batendo' : 'Saldo ajustado',
          difference === 0
            ? action.account.name
            : `Ajuste de ${formatCents(difference)} em ${action.account.name}`,
        );
      } else if (action.kind === 'reimburse' && owner) {
        await post(
          '/api/finance/cash-flow/transfers',
          {
            fromAccountId: fromId,
            toAccountId: owner.id,
            amount,
            reason: 'Reembolso ao proprietário',
          },
          true,
        );
        notify.success('Reembolso registrado', formatCents(cents));
      } else if (action.kind === 'contribution' && owner) {
        await post(
          `/api/financial-accounts/${owner.id}/owner-contribution`,
          { amount, note: reason.trim() || undefined },
          true,
        );
        notify.success(
          'Aporte registrado',
          `${formatCents(cents)} viraram investimento seu na loja`,
        );
      }
      onClose();
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível concluir.',
      );
    } finally {
      setPending(false);
    }
  }

  const titles: Record<Action['kind'], string> = {
    opening: 'Saldo inicial',
    reconcile: 'Conferir com o banco',
    reimburse: 'Reembolsar o seu bolso',
    contribution: 'Virou aporte',
  };

  return (
    <Drawer open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-w-lg">
        {action && (
          <div className="grid gap-4 overflow-y-auto px-4 pb-6">
            <DrawerHeader className="px-0">
              <DrawerTitle>{titles[action.kind]}</DrawerTitle>
              <DrawerDescription>
                {action.kind === 'opening' &&
                  `Quanto tinha em ${action.account.name} quando você começou a usar o sistema? Registrado uma vez, não conta como lucro.`}
                {action.kind === 'reconcile' &&
                  `Abra o app do banco e digite o saldo de ${action.account.name} agora. Se houver diferença, o sistema ajusta (não conta como lucro).`}
                {action.kind === 'reimburse' &&
                  'A loja devolve o que você pagou do seu bolso. É uma transferência: não mexe no lucro.'}
                {action.kind === 'contribution' &&
                  'Parte do que a loja te deve não vai voltar: vira dinheiro que você investiu na loja. Não é receita.'}
              </DrawerDescription>
            </DrawerHeader>

            {action.kind === 'opening' && (
              <SignedMoney
                label="Saldo inicial"
                cents={cents}
                onChange={setCents}
                negativeLabel="A conta estava negativa"
              />
            )}

            {action.kind === 'reconcile' && (
              <>
                <SignedMoney
                  label="Saldo que o banco mostra"
                  cents={cents}
                  onChange={setCents}
                  negativeLabel="O saldo está negativo"
                />
                <CalculatedBox title="Diferença">
                  <SummaryRow
                    label="No sistema"
                    value={formatCents(currentCents)}
                  />
                  <SummaryRow label="No banco" value={formatCents(cents)} />
                  <SummaryRow
                    label={
                      difference === 0
                        ? 'Está batendo'
                        : difference > 0
                          ? 'Ajuste (entra)'
                          : 'Ajuste (sai)'
                    }
                    value={formatCents(difference)}
                    strong
                  />
                </CalculatedBox>
                {difference !== 0 && (
                  <label className="grid gap-1 text-sm font-semibold text-neutral-700">
                    Motivo da diferença
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Ex.: tarifa do banco, Pix que não registrei"
                      className="h-11 rounded-md border border-neutral-200 px-3 font-normal text-neutral-900"
                    />
                  </label>
                )}
              </>
            )}

            {(action.kind === 'reimburse' ||
              action.kind === 'contribution') && (
              <>
                <CurrencyInput
                  label={
                    action.kind === 'reimburse'
                      ? 'Quanto vai reembolsar?'
                      : 'Quanto vira aporte?'
                  }
                  value={cents ? centsToDecimal(cents) : ''}
                  onValueChange={(value) => setCents(toCents(value))}
                  hint={`A loja te deve ${formatCents(owedCents)}.`}
                />
                {action.kind === 'reimburse' && (
                  <div className="grid gap-2">
                    <span className="text-sm font-semibold text-neutral-700">
                      De qual conta da loja sai?
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {storeAccounts.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          aria-pressed={fromId === account.id}
                          onClick={() => setFromId(account.id)}
                          className={cn(
                            'min-h-11 rounded-full border border-neutral-200 px-4 text-sm font-semibold text-neutral-700',
                            fromId === account.id &&
                              'border-brand-accent bg-brand-accent-subtle text-neutral-900',
                          )}
                        >
                          {account.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {action.kind === 'contribution' && (
                  <label className="grid gap-1 text-sm font-semibold text-neutral-700">
                    Observação (opcional)
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      className="h-11 rounded-md border border-neutral-200 px-3 font-normal text-neutral-900"
                    />
                  </label>
                )}
              </>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
              >
                {error}
              </p>
            )}
            <Button type="button" size="lg" loading={pending} onClick={submit}>
              {action.kind === 'reconcile' && difference === 0
                ? 'Confirmar que está batendo'
                : 'Confirmar'}
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

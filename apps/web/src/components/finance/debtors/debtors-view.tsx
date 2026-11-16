'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CalendarClock,
  ChevronDown,
  Copy,
  HandCoins,
  MessageCircle,
  Wallet,
} from 'lucide-react';
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
  addDays,
  chargeMessage,
  debtorSummary,
  whatsappLink,
  type Debtor,
  type OpenInstallment,
} from './debtors';

type Filter = 'all' | 'overdue' | 'week';
const FILTERS: Record<Filter, string> = {
  all: 'Todos',
  overdue: 'Atrasados',
  week: 'Vencem em 7 dias',
};
const dateLabel = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

function statusOf(debtor: Debtor) {
  if (debtor.overdueDays > 0)
    return {
      tone: 'danger' as const,
      text: `Atrasado há ${plural(debtor.overdueDays, 'dia', 'dias')}`,
    };
  if (debtor.nextDue)
    return {
      tone: 'neutral' as const,
      text: `Próxima em ${dateLabel(debtor.nextDue)}`,
    };
  return { tone: 'neutral' as const, text: 'Em dia' };
}

// Quem me deve (BR §10.14, fiado): quem está devendo, quanto, desde quando,
// e as duas ações do dia a dia — cobrar no WhatsApp e dar baixa no que foi
// pago. Atraso é sempre texto + cor, nunca só cor (DS-COLOR-001).
export function DebtorsView({
  debtors,
  today,
  companyName,
  accounts,
  canReceive,
  canSell,
}: {
  debtors: Debtor[];
  today: string;
  companyName: string;
  accounts: { id: string; name: string }[];
  canReceive: boolean;
  canSell: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(
    debtors[0]?.overdueDays ? debtors[0].key : null,
  );
  const [receiving, setReceiving] = useState<{
    debtor: Debtor;
    installment: OpenInstallment;
  } | null>(null);
  const summary = debtorSummary(debtors, today);
  const weekLimit = addDays(today, 7);

  const visible = debtors.filter((debtor) =>
    filter === 'overdue'
      ? debtor.overdueCents > 0
      : filter === 'week'
        ? debtor.installments.some((item) => item.dueDate <= weekLimit)
        : true,
  );

  return (
    <main className="page-content grid gap-5">
      <header>
        <p className="text-xs font-semibold tracking-wide text-brand-accent-hover uppercase">
          Financeiro
        </p>
        <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
          Quem me deve
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fiado e parcelas em aberto, por cliente.
        </p>
      </header>

      {debtors.length === 0 ? (
        <section className="grid justify-items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-0 px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-success-50 text-success-600">
            <HandCoins className="size-6" aria-hidden="true" />
          </span>
          <strong className="text-lg text-neutral-900">
            Ninguém está devendo agora
          </strong>
          <p className="max-w-sm text-sm text-neutral-500">
            Quando você vender no fiado ou parcelado, as parcelas em aberto
            aparecem aqui para cobrar e dar baixa.
          </p>
          {canSell && (
            <Button asChild>
              <Link href="/vendas/nova">Nova venda</Link>
            </Button>
          )}
        </section>
      ) : (
        <>
          <section
            aria-label="Resumo"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            <Kpi
              icon={Wallet}
              label="A receber"
              value={formatCents(summary.openCents)}
              detail={plural(debtors.length, 'cliente', 'clientes')}
              className="col-span-2 sm:col-span-1"
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <Kpi
              icon={AlertCircle}
              label="Atrasado"
              value={formatCents(summary.overdueCents)}
              detail={
                summary.overdueCount
                  ? plural(
                      summary.overdueCount,
                      'cliente atrasado',
                      'clientes atrasados',
                    )
                  : 'Ninguém atrasado'
              }
              tone={summary.overdueCents > 0 ? 'danger' : undefined}
              active={filter === 'overdue'}
              onClick={() => setFilter('overdue')}
            />
            <Kpi
              icon={CalendarClock}
              label="Próximos 7 dias"
              value={formatCents(summary.weekCents)}
              detail="Ainda em dia"
              active={filter === 'week'}
              onClick={() => setFilter('week')}
            />
          </section>

          <div className="flex items-center justify-between gap-3">
            <h2
              className="text-md font-semibold text-neutral-900"
              aria-live="polite"
            >
              {FILTERS[filter]} ·{' '}
              {plural(visible.length, 'cliente', 'clientes')}
            </h2>
            {filter !== 'all' && (
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                onClick={() => setFilter('all')}
              >
                Ver todos
              </Button>
            )}
          </div>

          <ul className="grid gap-3" aria-label="Clientes que devem">
            {visible.map((debtor) => {
              const status = statusOf(debtor);
              const expanded = open === debtor.key;
              const message = chargeMessage(debtor, companyName);
              const link = whatsappLink(debtor.phone, message);
              return (
                <li
                  key={debtor.key}
                  className="rounded-lg border border-neutral-100 bg-neutral-0"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : debtor.key)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-brand-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-md font-semibold text-neutral-900">
                        {debtor.name}
                      </strong>
                      <span
                        className={cn(
                          'mt-1 inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold',
                          status.tone === 'danger'
                            ? 'bg-danger-50 text-danger-600'
                            : 'bg-neutral-50 text-neutral-700',
                        )}
                      >
                        {status.tone === 'danger' && (
                          <AlertCircle
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        )}
                        {status.text}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <strong className="block text-md font-bold text-neutral-900 tabular-nums">
                        {formatCents(debtor.openCents)}
                      </strong>
                      <span className="text-xs text-neutral-500">
                        {plural(
                          debtor.installments.length,
                          'parcela',
                          'parcelas',
                        )}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'size-5 shrink-0 text-neutral-300 transition-transform',
                        expanded && 'rotate-180',
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {expanded && (
                    <div className="grid gap-3 border-t border-neutral-100 px-4 py-3">
                      <ul className="grid gap-2">
                        {debtor.installments.map((installment) => (
                          <li
                            key={installment.id}
                            className="flex items-center gap-3 rounded-md bg-neutral-25 px-3 py-2"
                          >
                            <span className="min-w-0 flex-1 text-sm">
                              <span className="block truncate font-semibold text-neutral-900">
                                {installment.label}
                              </span>
                              <span
                                className={cn(
                                  'text-neutral-500',
                                  installment.overdueDays > 0 &&
                                    'font-semibold text-danger-600',
                                )}
                              >
                                {installment.overdueDays > 0
                                  ? `Venceu em ${dateLabel(installment.dueDate)} · ${plural(installment.overdueDays, 'dia', 'dias')} de atraso`
                                  : installment.dueDate === today
                                    ? 'Vence hoje'
                                    : `Vence em ${dateLabel(installment.dueDate)}`}
                              </span>
                            </span>
                            <strong className="shrink-0 text-sm tabular-nums">
                              {formatCents(installment.openCents)}
                            </strong>
                            {canReceive && accounts.length > 0 && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setReceiving({ debtor, installment })
                                }
                                aria-label={`Registrar recebimento: ${installment.label} de ${debtor.name}`}
                              >
                                Recebi
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {debtor.customerId && (
                        <div className="flex flex-wrap gap-2">
                          {link ? (
                            <Button asChild>
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MessageCircle aria-hidden="true" />
                                Cobrar no WhatsApp
                              </a>
                            </Button>
                          ) : (
                            <p className="w-full text-xs text-neutral-500">
                              {debtor.phone
                                ? `O número cadastrado (${debtor.phone}) não parece um celular válido.`
                                : 'Sem WhatsApp cadastrado.'}{' '}
                              <Link
                                className="font-semibold text-brand-accent-hover underline"
                                href={`/clientes?q=${encodeURIComponent(debtor.name)}`}
                              >
                                {debtor.phone
                                  ? 'Corrigir em Clientes'
                                  : 'Adicionar em Clientes'}
                              </Link>{' '}
                              ou copie a mensagem.
                            </p>
                          )}
                          <Button
                            type="button"
                            variant={link ? 'secondary' : 'primary'}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(message);
                                notify.success(
                                  'Mensagem copiada',
                                  'Cole na conversa com o cliente.',
                                );
                              } catch {
                                notify.error(
                                  'Não foi possível copiar',
                                  'Selecione e copie a mensagem manualmente.',
                                );
                              }
                            }}
                          >
                            <Copy aria-hidden="true" />
                            Copiar mensagem
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="rounded-md bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
                {filter === 'overdue'
                  ? 'Ninguém está atrasado.'
                  : 'Nada vencendo nos próximos 7 dias.'}
              </li>
            )}
          </ul>
        </>
      )}

      <ReceiveDrawer
        receiving={receiving}
        accounts={accounts}
        onClose={() => setReceiving(null)}
      />
    </main>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  active,
  onClick,
  className,
}: {
  className?: string;
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
  tone?: 'danger';
  active: boolean;
  onClick: () => void;
}) {
  // DS-KPI-001: o card é clicável e filtra a lista que compõe o número.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'grid min-w-0 gap-1 rounded-lg border border-neutral-100 bg-neutral-0 p-3 text-left shadow-sm focus-visible:outline-2 focus-visible:outline-brand-accent sm:p-4',
        active && 'border-brand-accent bg-brand-accent-subtle',
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Icon
          className={cn(
            'size-4',
            tone === 'danger' ? 'text-danger-600' : 'text-brand-accent-hover',
          )}
          aria-hidden="true"
        />
        {label}
      </span>
      <strong
        className={cn(
          'truncate text-xl font-bold tabular-nums sm:text-2xl',
          tone === 'danger' ? 'text-danger-600' : 'text-neutral-900',
        )}
      >
        {value}
      </strong>
      <span className="text-xs text-neutral-500">{detail}</span>
    </button>
  );
}

function ReceiveDrawer({
  receiving,
  accounts,
  onClose,
}: {
  receiving: { debtor: Debtor; installment: OpenInstallment } | null;
  accounts: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [accountId, setAccountId] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [key, setKey] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [current, setCurrent] = useState<string>();

  // Reinicia o formulário a cada parcela aberta.
  if (receiving && current !== receiving.installment.id) {
    setCurrent(receiving.installment.id);
    setAccountId(accounts.length === 1 ? accounts[0].id : '');
    setAmountCents(receiving.installment.openCents);
    setKey(undefined);
    setError(undefined);
  }

  async function submit() {
    if (!receiving) return;
    if (!accountId) return setError('Escolha em qual conta o dinheiro entrou.');
    if (amountCents <= 0) return setError('Informe um valor maior que zero.');
    if (amountCents > receiving.installment.openCents)
      return setError(
        `O valor não pode passar de ${formatCents(receiving.installment.openCents)}.`,
      );
    const idempotencyKey = key ?? crypto.randomUUID();
    setKey(idempotencyKey);
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/finance/receivables/${receiving.installment.id}/pay`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            financialAccountId: accountId,
            amount: Number(centsToDecimal(amountCents)),
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) {
        setKey(undefined);
        throw new Error(
          body.message ?? 'Não foi possível registrar o recebimento.',
        );
      }
      notify.success(
        'Recebimento registrado',
        `${formatCents(amountCents)} de ${receiving.debtor.name}`,
      );
      onClose();
      setCurrent(undefined);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível registrar o recebimento.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Drawer
      open={Boolean(receiving)}
      onOpenChange={(next) => !next && onClose()}
    >
      <DrawerContent className="mx-auto max-w-lg">
        {receiving && (
          <div className="grid gap-4 px-4 pb-4">
            <DrawerHeader className="px-0">
              <DrawerTitle>Registrar recebimento</DrawerTitle>
              <DrawerDescription>
                {receiving.debtor.name} · {receiving.installment.label} · em
                aberto {formatCents(receiving.installment.openCents)}
              </DrawerDescription>
            </DrawerHeader>
            <CurrencyInput
              label="Quanto você recebeu?"
              value={amountCents ? centsToDecimal(amountCents) : ''}
              onValueChange={(value) => setAmountCents(toCents(value))}
              hint={
                amountCents > 0 && amountCents < receiving.installment.openCents
                  ? `Recebimento parcial: ficam ${formatCents(receiving.installment.openCents - amountCents)} em aberto.`
                  : undefined
              }
            />
            <div className="grid gap-2">
              <span className="text-sm font-semibold text-neutral-700">
                Em qual conta entrou?
              </span>
              <div className="flex flex-wrap gap-2">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    aria-pressed={accountId === account.id}
                    onClick={() => setAccountId(account.id)}
                    className={cn(
                      'min-h-11 rounded-full border border-neutral-200 px-4 text-sm font-semibold text-neutral-700',
                      accountId === account.id &&
                        'border-brand-accent bg-brand-accent-subtle text-neutral-900',
                    )}
                  >
                    {account.name}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
              >
                {error}
              </p>
            )}
            <Button type="button" size="lg" onClick={submit} loading={pending}>
              Registrar{' '}
              {amountCents > 0 ? formatCents(amountCents) : 'recebimento'}
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

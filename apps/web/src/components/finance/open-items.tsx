'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppIcon } from '@/components/layout/app-icon';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SelectField } from '@/components/ui/select-field';

type Account = { id: string; name: string; status: string };
type Payment = {
  id: string;
  financialAccountId: string;
  amount: string;
  interest?: string | null;
  discount?: string | null;
  paidAt: string;
};
export type OpenItem = {
  id: string;
  description: string;
  amountOriginal: string;
  amountApplied: string;
  dueDate: string;
  createdAt?: string;
  status: string;
  isOverdue?: boolean;
  cancelReason?: string | null;
  customer?: { name: string } | null;
  supplier?: { name: string } | null;
  payments?: Payment[];
};

const money = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
const civilDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
const messageOf = (body: unknown, fallback: string) =>
  body && typeof body === 'object'
    ? ((body as { message?: string; error?: { message?: string } }).error
        ?.message ??
      (body as { message?: string }).message ??
      fallback)
    : fallback;
const isOpen = (status: string) =>
  ['pending', 'partially_received', 'partially_paid'].includes(status);
const statusText = (item: OpenItem, kind: 'receivables' | 'payables') =>
  item.isOverdue
    ? 'Vencida'
    : item.status === 'pending'
      ? 'Pendente'
      : item.status === 'partially_received'
        ? 'Recebida parcialmente'
        : item.status === 'partially_paid'
          ? 'Paga parcialmente'
          : item.status === 'received'
            ? 'Recebida'
            : item.status === 'paid'
              ? 'Paga'
              : item.status === 'cancelled'
                ? 'Cancelada'
                : kind === 'receivables'
                  ? 'A receber'
                  : 'A pagar';
const statusClass = (item: OpenItem) =>
  item.status === 'cancelled' || item.isOverdue
    ? 'cancelled'
    : isOpen(item.status)
      ? 'pending'
      : 'active';

function SettlementDialog({
  kind,
  item,
  accounts,
  open,
  onOpenChange,
}: {
  kind: 'receivables' | 'payables';
  item: OpenItem;
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const remaining = Number(item.amountOriginal) - Number(item.amountApplied);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/finance/${kind}/${item.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          financialAccountId: values.get('account'),
          amount: Number(values.get('amount')),
          interest: Number(values.get('interest') || 0),
          discount: Number(values.get('discount') || 0),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(messageOf(body, 'Não foi possível registrar a baixa.'));
      onOpenChange(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível registrar a baixa.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="finance-settlement-dialog">
        <div className="dialog-heading">
          <div>
            <DialogTitle>
              {kind === 'receivables'
                ? 'Registrar recebimento'
                : 'Registrar pagamento'}
            </DialogTitle>
            <DialogDescription>
              {item.description} · saldo em aberto de {money(remaining)}
            </DialogDescription>
          </div>
          <DialogClose className="dialog-close" aria-label="Fechar">
            ×
          </DialogClose>
        </div>
        <form className="dialog-form" onSubmit={submit}>
          <SelectField
            label="Conta financeira"
            name="account"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Selecione a conta
            </option>
            {accounts
              .filter((account) => account.status === 'active')
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
          </SelectField>
          <div className="form-grid">
            <CurrencyInput
              label="Valor aplicado"
              name="amount"
              min={0.01}
              max={remaining}
              defaultValue={remaining.toFixed(2)}
              required
            />
            <CurrencyInput
              label="Juros"
              name="interest"
              min={0}
              defaultValue="0"
            />
            <CurrencyInput
              label="Desconto"
              name="discount"
              min={0}
              defaultValue="0"
            />
          </div>
          <div className="finance-net-preview">
            <span>Efeito no saldo da conta</span>
            <strong>
              O valor aplicado reduz a dívida; juros e desconto ajustam somente
              o caixa.
            </strong>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <DialogClose asChild>
              <button className="button button-secondary" type="button">
                Voltar
              </button>
            </DialogClose>
            <button
              className="button button-primary compact-button"
              disabled={pending}
            >
              {pending
                ? 'Registrando…'
                : kind === 'receivables'
                  ? 'Confirmar recebimento'
                  : 'Confirmar pagamento'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  kind,
  item,
  open,
  onOpenChange,
}: {
  kind: 'receivables' | 'payables';
  item: OpenItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get('reason');
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/finance/${kind}/${item.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(messageOf(body, 'Não foi possível cancelar a conta.'));
      onOpenChange(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível cancelar a conta.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="dialog-heading">
          <div>
            <DialogTitle>
              Cancelar{' '}
              {kind === 'receivables' ? 'conta a receber' : 'conta a pagar'}?
            </DialogTitle>
            <DialogDescription>
              O registro permanecerá no histórico e não poderá receber novas
              baixas.
            </DialogDescription>
          </div>
          <DialogClose className="dialog-close" aria-label="Fechar">
            ×
          </DialogClose>
        </div>
        <form className="dialog-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor={`cancel-${item.id}`}>Motivo do cancelamento</label>
            <textarea
              id={`cancel-${item.id}`}
              name="reason"
              required
              maxLength={500}
              placeholder="Explique por que esta conta está sendo cancelada"
            />
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <DialogClose asChild>
              <button className="button button-secondary" type="button">
                Voltar
              </button>
            </DialogClose>
            <button className="button button-danger" disabled={pending}>
              {pending ? 'Cancelando…' : 'Confirmar cancelamento'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({
  kind,
  item,
  accounts,
  open,
  onOpenChange,
}: {
  kind: 'receivables' | 'payables';
  item: OpenItem;
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const remaining = Number(item.amountOriginal) - Number(item.amountApplied);
  const related = item.customer?.name ?? item.supplier?.name;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sale-detail-dialog finance-detail-dialog">
        <header className="sale-detail-header">
          <div className="sale-detail-title">
            <span className="sale-detail-icon">
              <AppIcon name="finance" />
            </span>
            <div>
              <span className="sale-detail-eyebrow">
                {kind === 'receivables' ? 'Conta a receber' : 'Conta a pagar'}
              </span>
              <DialogTitle>{item.description}</DialogTitle>
              <DialogDescription>
                {related ? `${related} · ` : ''}vencimento em{' '}
                {civilDate(item.dueDate)}
              </DialogDescription>
            </div>
          </div>
          <div className="sale-detail-header-actions">
            <span className={`status-badge ${statusClass(item)}`}>
              {statusText(item, kind)}
            </span>
            <DialogClose className="dialog-close" aria-label="Fechar">
              ×
            </DialogClose>
          </div>
        </header>
        <div className="sale-detail-layout">
          <div className="sale-detail-main">
            <section className="sale-detail-card finance-title-overview">
              <div>
                <span>Valor original</span>
                <strong>{money(item.amountOriginal)}</strong>
              </div>
              <div>
                <span>{kind === 'receivables' ? 'Recebido' : 'Pago'}</span>
                <strong>{money(item.amountApplied)}</strong>
              </div>
              <div>
                <span>Saldo em aberto</span>
                <strong>{money(remaining)}</strong>
              </div>
            </section>
            <section className="sale-detail-card sale-detail-section">
              <div className="sale-detail-section-heading">
                <div>
                  <span className="sale-detail-section-icon">
                    <AppIcon name="finance" />
                  </span>
                  <div>
                    <h3>Histórico de baixas</h3>
                    <p>Pagamentos são imutáveis e formam o valor realizado.</p>
                  </div>
                </div>
                <strong>{item.payments?.length ?? 0}</strong>
              </div>
              {!item.payments?.length ? (
                <div className="sale-detail-empty">
                  <span>—</span>
                  <p>Nenhuma baixa foi registrada nesta conta.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Conta</th>
                        <th className="number">Valor</th>
                        <th className="number">Juros</th>
                        <th className="number">Desconto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td data-label="Data">{dateTime(payment.paidAt)}</td>
                          <td data-label="Conta">
                            {accounts.find(
                              (account) =>
                                account.id === payment.financialAccountId,
                            )?.name ?? 'Conta histórica'}
                          </td>
                          <td data-label="Valor" className="number">
                            {money(payment.amount)}
                          </td>
                          <td data-label="Juros" className="number">
                            {money(payment.interest ?? 0)}
                          </td>
                          <td data-label="Desconto" className="number">
                            {money(payment.discount ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
          <aside className="sale-financial-summary">
            <div className="sale-financial-heading">
              <span>Resumo financeiro</span>
              <p>O previsto e o realizado permanecem separados.</p>
            </div>
            <dl>
              <div>
                <dt>Valor original</dt>
                <dd>{money(item.amountOriginal)}</dd>
              </div>
              <div>
                <dt>Valor realizado</dt>
                <dd>{money(item.amountApplied)}</dd>
              </div>
              <div>
                <dt>Vencimento</dt>
                <dd>{civilDate(item.dueDate)}</dd>
              </div>
              {related && (
                <div>
                  <dt>{kind === 'receivables' ? 'Cliente' : 'Fornecedor'}</dt>
                  <dd>{related}</dd>
                </div>
              )}
            </dl>
            <div
              className={`sale-detail-state ${item.status === 'cancelled' ? 'cancelled' : isOpen(item.status) ? 'draft' : ''}`}
            >
              <AppIcon name="shield" />
              <p>
                {item.status === 'cancelled'
                  ? `Cancelada${item.cancelReason ? `: ${item.cancelReason}` : '.'}`
                  : isOpen(item.status)
                    ? 'O saldo continuará no caixa previsto até ser totalmente baixado.'
                    : 'Esta conta foi totalmente realizada no fluxo de caixa.'}
              </p>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItemRow({
  kind,
  item,
  accounts,
  canManage,
}: {
  kind: 'receivables' | 'payables';
  item: OpenItem;
  accounts: Account[];
  canManage: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const remaining = Number(item.amountOriginal) - Number(item.amountApplied);
  return (
    <tr>
      <td data-label="Descrição">
        <strong>{item.description}</strong>
        {(item.customer?.name || item.supplier?.name) && (
          <small className="table-detail">
            {item.customer?.name ?? item.supplier?.name}
          </small>
        )}
      </td>
      <td data-label="Vencimento">{civilDate(item.dueDate)}</td>
      <td data-label="Status">
        <span className={`status-badge ${statusClass(item)}`}>
          {statusText(item, kind)}
        </span>
      </td>
      <td data-label="Valor original" className="number">
        {money(item.amountOriginal)}
      </td>
      <td data-label="Saldo" className="number">
        <strong>{money(remaining)}</strong>
      </td>
      <td className="table-actions-cell" data-label="Ações">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="row-menu-trigger"
              type="button"
              aria-label={`Ações de ${item.description}`}
            >
              <AppIcon name="more" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6}>
            <DropdownMenuItem
              className="dropdown-item view"
              onSelect={() => setDetailOpen(true)}
            >
              <span>
                <AppIcon name="eye" />
              </span>
              <div>
                <strong>Visualizar</strong>
                <small>Ver valores e histórico</small>
              </div>
            </DropdownMenuItem>
            {canManage && isOpen(item.status) && (
              <DropdownMenuItem
                className="dropdown-item success"
                onSelect={() => setSettlementOpen(true)}
              >
                <span>
                  <AppIcon name="finance" />
                </span>
                <div>
                  <strong>
                    {kind === 'receivables'
                      ? 'Receber valor'
                      : 'Registrar pagamento'}
                  </strong>
                  <small>Baixa total ou parcial</small>
                </div>
              </DropdownMenuItem>
            )}
            {canManage && isOpen(item.status) && (
              <DropdownMenuItem
                className="dropdown-item danger"
                onSelect={() => setCancelOpen(true)}
              >
                <span>
                  <AppIcon name="cancel" />
                </span>
                <div>
                  <strong>Cancelar conta</strong>
                  <small>Preservar no histórico</small>
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <DetailDialog
          kind={kind}
          item={item}
          accounts={accounts}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
        <SettlementDialog
          kind={kind}
          item={item}
          accounts={accounts}
          open={settlementOpen}
          onOpenChange={setSettlementOpen}
        />
        <CancelDialog
          kind={kind}
          item={item}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
      </td>
    </tr>
  );
}

export function OpenItems({
  title,
  kind,
  items,
  accounts,
  canManage,
}: {
  title: string;
  kind: 'receivables' | 'payables';
  items: OpenItem[];
  accounts: Account[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!query.trim() ||
            item.description
              .toLocaleLowerCase('pt-BR')
              .includes(query.trim().toLocaleLowerCase('pt-BR'))) &&
          (status === 'all' ||
            (status === 'overdue'
              ? item.isOverdue
              : status === 'open'
                ? isOpen(item.status) && !item.isOverdue
                : item.status === status)),
      ),
    [items, query, status],
  );
  const totalPages = Math.max(Math.ceil(filtered.length / 10), 1);
  const visible = filtered.slice(
    (Math.min(page, totalPages) - 1) * 10,
    Math.min(page, totalPages) * 10,
  );
  return (
    <section className="data-card finance-ledger">
      <div className="data-card-heading">
        <div>
          <h2>{title}</h2>
          <p>
            Acompanhe previsto, realizado e vencimentos em um único histórico.
          </p>
        </div>
      </div>
      <div className="listing-search finance-list-filters">
        <div className="search-field">
          <AppIcon name="search" />
          <input
            aria-label={`Buscar em ${title}`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por descrição"
          />
        </div>
        <SelectField
          label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Todos os status</option>
          <option value="open">Em aberto</option>
          <option value="overdue">Vencidas</option>
          <option value={kind === 'receivables' ? 'received' : 'paid'}>
            {kind === 'receivables' ? 'Recebidas' : 'Pagas'}
          </option>
          <option value="cancelled">Canceladas</option>
        </SelectField>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th className="number">Valor original</th>
              <th className="number">Saldo</th>
              <th className="table-actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr className="table-empty-row">
                <td className="table-empty-cell" colSpan={6}>
                  <span className="table-empty-icon">
                    <AppIcon name="finance" />
                  </span>
                  <strong>
                    {items.length === 0
                      ? `Nenhuma ${kind === 'receivables' ? 'conta a receber' : 'conta a pagar'}`
                      : 'Nenhum resultado encontrado'}
                  </strong>
                  <p>
                    {items.length === 0
                      ? 'Os próximos lançamentos aparecerão aqui com seu vencimento e saldo.'
                      : 'Altere a busca ou o filtro de status.'}
                  </p>
                </td>
              </tr>
            ) : (
              visible.map((item) => (
                <ItemRow
                  key={item.id}
                  kind={kind}
                  item={item}
                  accounts={accounts}
                  canManage={canManage}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 10 && (
        <nav className="page-actions listing-pagination finance-pagination">
          <button
            className="button button-secondary compact-button"
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </button>
          <span className="user-chip">
            Página {Math.min(page, totalPages)} de {totalPages}
          </span>
          <button
            className="button button-secondary compact-button"
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Próxima
          </button>
        </nav>
      )}
    </section>
  );
}

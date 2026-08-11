'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppIcon } from '@/components/layout/app-icon';
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

export type ExpenseItem = {
  id: string;
  description: string;
  category: string;
  amount: string;
  status: string;
  competenceDate: string;
  dueDate?: string | null;
  paidAt?: string | null;
  financialAccount?: { name: string } | null;
  payable?: {
    id: string;
    amountOriginal: string;
    amountPaid: string;
    status: string;
  } | null;
};
const money = (value: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
const date = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
const category: Record<string, string> = {
  mercadorias: 'Mercadorias',
  frete: 'Frete',
  embalagem: 'Embalagem',
  publicidade: 'Publicidade',
  plataforma: 'Plataforma',
  telefone: 'Telefone',
  internet: 'Internet',
  aluguel: 'Aluguel',
  energia: 'Energia',
  transporte: 'Transporte',
  combustivel: 'Combustível',
  taxa: 'Taxa',
  imposto: 'Imposto',
  manutencao: 'Manutenção',
  pro_labore: 'Pró-labore',
  retirada: 'Retirada',
  despesa_administrativa: 'Administrativa',
  perda: 'Perda',
  outra: 'Outra',
};
const statusText = (status: string) =>
  status === 'paid'
    ? 'Paga'
    : status === 'cancelled'
      ? 'Cancelada'
      : 'Pendente';

function ExpenseRow({
  expense,
  canManage,
}: {
  expense: ExpenseItem;
  canManage: boolean;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function cancelExpense() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/finance/expenses/${expense.id}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? 'Não foi possível cancelar a despesa.');
      setCancel(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível cancelar a despesa.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <tr>
      <td data-label="Descrição">
        <strong>{expense.description}</strong>
        <small className="table-detail">
          {category[expense.category] ?? expense.category}
        </small>
      </td>
      <td data-label="Competência">{date(expense.competenceDate)}</td>
      <td data-label="Status">
        <span
          className={`status-badge ${expense.status === 'paid' ? 'active' : expense.status === 'cancelled' ? 'cancelled' : 'pending'}`}
        >
          {statusText(expense.status)}
        </span>
      </td>
      <td data-label="Conta">
        {expense.financialAccount?.name ??
          (expense.payable ? 'Conta a pagar vinculada' : '—')}
      </td>
      <td data-label="Valor" className="number">
        <strong>{money(expense.amount)}</strong>
      </td>
      <td className="table-actions-cell" data-label="Ações">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="row-menu-trigger"
              type="button"
              aria-label={`Ações de ${expense.description}`}
            >
              <AppIcon name="more" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6}>
            <DropdownMenuItem
              className="dropdown-item view"
              onSelect={() => setDetail(true)}
            >
              <span>
                <AppIcon name="eye" />
              </span>
              <div>
                <strong>Visualizar</strong>
                <small>Ver origem e datas</small>
              </div>
            </DropdownMenuItem>
            {canManage && expense.status === 'pending' && (
              <DropdownMenuItem
                className="dropdown-item danger"
                onSelect={() => setCancel(true)}
              >
                <span>
                  <AppIcon name="cancel" />
                </span>
                <div>
                  <strong>Cancelar despesa</strong>
                  <small>Cancelar compromisso vinculado</small>
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={detail} onOpenChange={setDetail}>
          <DialogContent>
            <div className="dialog-heading">
              <div>
                <DialogTitle>{expense.description}</DialogTitle>
                <DialogDescription>
                  Despesa de {category[expense.category] ?? expense.category}
                </DialogDescription>
              </div>
              <DialogClose className="dialog-close" aria-label="Fechar">
                ×
              </DialogClose>
            </div>
            <dl className="finance-detail-list">
              <div>
                <dt>Valor</dt>
                <dd>{money(expense.amount)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{statusText(expense.status)}</dd>
              </div>
              <div>
                <dt>Competência</dt>
                <dd>{date(expense.competenceDate)}</dd>
              </div>
              <div>
                <dt>Vencimento</dt>
                <dd>
                  {expense.dueDate
                    ? date(expense.dueDate)
                    : 'Pagamento imediato'}
                </dd>
              </div>
              <div>
                <dt>Conta financeira</dt>
                <dd>{expense.financialAccount?.name ?? 'Não realizada'}</dd>
              </div>
            </dl>
            <div className="sale-detail-state draft">
              <AppIcon name="shield" />
              <p>
                {expense.status === 'paid'
                  ? 'Esta despesa já compõe o caixa realizado.'
                  : expense.status === 'pending'
                    ? 'Esta despesa compõe o previsto por meio da conta a pagar vinculada.'
                    : 'A despesa foi cancelada e não compõe o realizado.'}
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={cancel} onOpenChange={setCancel}>
          <DialogContent>
            <div className="dialog-heading">
              <div>
                <DialogTitle>Cancelar despesa pendente?</DialogTitle>
                <DialogDescription>
                  A conta a pagar vinculada também será cancelada. O histórico
                  será preservado.
                </DialogDescription>
              </div>
              <DialogClose className="dialog-close" aria-label="Fechar">
                ×
              </DialogClose>
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
                className="button button-danger"
                type="button"
                onClick={cancelExpense}
                disabled={pending}
              >
                {pending ? 'Cancelando…' : 'Confirmar cancelamento'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
}

export function ExpenseList({
  expenses,
  canManage,
}: {
  expenses: ExpenseItem[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = useMemo(
    () =>
      expenses.filter(
        (item) =>
          (!query.trim() ||
            item.description
              .toLocaleLowerCase('pt-BR')
              .includes(query.trim().toLocaleLowerCase('pt-BR'))) &&
          (status === 'all' || item.status === status),
      ),
    [expenses, query, status],
  );
  return (
    <section className="data-card finance-ledger">
      <div className="data-card-heading">
        <div>
          <h2>Despesas</h2>
          <p>Acompanhe gastos por competência e situação de pagamento.</p>
        </div>
      </div>
      <div className="listing-search finance-list-filters">
        <div className="search-field">
          <AppIcon name="search" />
          <input
            aria-label="Buscar despesa"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por descrição"
          />
        </div>
        <SelectField
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">Todos os status</option>
          <option value="pending">Pendentes</option>
          <option value="paid">Pagas</option>
          <option value="cancelled">Canceladas</option>
        </SelectField>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Competência</th>
              <th>Status</th>
              <th>Conta / origem</th>
              <th className="number">Valor</th>
              <th className="table-actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="table-empty-row">
                <td className="table-empty-cell" colSpan={6}>
                  <span className="table-empty-icon">
                    <AppIcon name="finance" />
                  </span>
                  <strong>
                    {expenses.length === 0
                      ? 'Nenhuma despesa registrada'
                      : 'Nenhum resultado encontrado'}
                  </strong>
                  <p>
                    {expenses.length === 0
                      ? 'Registre uma despesa paga ou um compromisso futuro.'
                      : 'Altere a busca ou o filtro de status.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  canManage={canManage}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

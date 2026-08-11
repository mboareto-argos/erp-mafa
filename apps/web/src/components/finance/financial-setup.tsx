'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppIcon } from '@/components/layout/app-icon';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SelectField } from '@/components/ui/select-field';

type Account = { id: string; name: string; status: string; balance?: string };
type Method = {
  id: string;
  name: string;
  type: string;
  financialAccountId: string | null;
  status: string;
  feeRate?: string | null;
  feeFixed?: string | null;
};
const money = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
const methodType: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  debit_card: 'Cartão de débito',
  credit_card: 'Cartão de crédito',
  bank_transfer: 'Transferência',
  store_credit: 'Crédito da loja',
  other: 'Outro',
};

function CreateAccount({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch('/api/financial-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: new FormData(event.currentTarget).get('name'),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? 'Não foi possível criar a conta.');
      setOpen(false);
      onCreated();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível criar a conta.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="button button-primary compact-button" type="button">
          <AppIcon name="plus" /> Nova conta
        </button>
      </DialogTrigger>
      <DialogContent>
        <div className="dialog-heading">
          <div>
            <DialogTitle>Nova conta financeira</DialogTitle>
            <DialogDescription>
              Cadastre onde o dinheiro entra, sai ou transita.
            </DialogDescription>
          </div>
          <DialogClose className="dialog-close" aria-label="Fechar">
            ×
          </DialogClose>
        </div>
        <form className="dialog-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="account-name">Nome da conta</label>
            <input
              id="account-name"
              name="name"
              required
              maxLength={160}
              placeholder="Ex.: Caixa da loja ou Banco"
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
            <button
              className="button button-primary compact-button"
              disabled={pending}
            >
              {pending ? 'Criando…' : 'Criar conta'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateMethod({
  accounts,
  onCreated,
}: {
  accounts: Account[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch('/api/payments/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.get('type'),
          name: data.get('name'),
          financialAccountId: data.get('account') || undefined,
          feeRate: data.get('feeRate')
            ? Number(data.get('feeRate'))
            : undefined,
          feeFixed: data.get('feeFixed')
            ? Number(data.get('feeFixed'))
            : undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? 'Não foi possível criar a forma.');
      setOpen(false);
      onCreated();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível criar a forma.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="button button-secondary compact-button"
          type="button"
        >
          <AppIcon name="plus" /> Nova forma de pagamento
        </button>
      </DialogTrigger>
      <DialogContent>
        <div className="dialog-heading">
          <div>
            <DialogTitle>Nova forma de pagamento</DialogTitle>
            <DialogDescription>
              Configure o destino e as taxas usadas nos próximos recebimentos.
            </DialogDescription>
          </div>
          <DialogClose className="dialog-close" aria-label="Fechar">
            ×
          </DialogClose>
        </div>
        <form className="dialog-form" onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="method-name">Nome</label>
              <input
                id="method-name"
                name="name"
                required
                maxLength={120}
                placeholder="Ex.: PIX principal"
              />
            </div>
            <SelectField label="Tipo" name="type">
              <option value="pix">PIX</option>
              <option value="cash">Dinheiro</option>
              <option value="debit_card">Cartão de débito</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="bank_transfer">Transferência</option>
              <option value="store_credit">Crédito da loja</option>
              <option value="other">Outro</option>
            </SelectField>
            <SelectField label="Conta de destino" name="account">
              <option value="">Sem conta vinculada</option>
              {accounts
                .filter((account) => account.status === 'active')
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </SelectField>
            <div className="field">
              <label htmlFor="method-rate">Taxa percentual</label>
              <input
                id="method-rate"
                name="feeRate"
                type="number"
                min="0"
                max="100"
                step="0.0001"
                placeholder="0,00%"
              />
            </div>
            <CurrencyInput label="Taxa fixa" name="feeFixed" min={0} />
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
              {pending ? 'Criando…' : 'Criar forma'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateAction({
  resource,
  id,
  name,
  onChanged,
}: {
  resource: 'financial-accounts' | 'payments/methods';
  id: string;
  name: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function deactivate() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/${resource}/${id}/deactivate`, {
        method: 'PATCH',
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? 'Não foi possível inativar.');
      setOpen(false);
      onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível inativar.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="row-menu-trigger"
            type="button"
            aria-label={`Ações de ${name}`}
          >
            <AppIcon name="more" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="dropdown-item danger"
            onSelect={() => setOpen(true)}
          >
            <span>
              <AppIcon name="cancel" />
            </span>
            <div>
              <strong>Inativar</strong>
              <small>Preservar no histórico</small>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <div className="dialog-heading">
            <div>
              <DialogTitle>Inativar {name}?</DialogTitle>
              <DialogDescription>
                O registro deixa de aparecer em novas operações, mas permanece
                no histórico.
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
              disabled={pending}
              onClick={deactivate}
            >
              {pending ? 'Inativando…' : 'Confirmar inativação'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FinancialSetup({
  accounts,
  methods,
  canManageAccounts,
  canManageMethods,
}: {
  accounts: Account[];
  methods: Method[];
  canManageAccounts: boolean;
  canManageMethods: boolean;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <div className="finance-setup-stack">
      <section className="data-card">
        <div className="data-card-heading">
          <div>
            <h2>Contas financeiras</h2>
            <p>
              O saldo é sempre calculado pelas movimentações e nunca editado
              diretamente.
            </p>
          </div>
          {canManageAccounts && <CreateAccount onCreated={refresh} />}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Conta</th>
                <th>Status</th>
                <th className="number">Saldo realizado</th>
                <th>Formas vinculadas</th>
                {canManageAccounts && (
                  <th className="table-actions-column">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr className="table-empty-row">
                  <td className="table-empty-cell" colSpan={5}>
                    <strong>Nenhuma conta financeira</strong>
                    <p>
                      Cadastre um caixa, banco ou carteira para registrar
                      movimentações.
                    </p>
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td data-label="Conta">
                      <strong>{account.name}</strong>
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge ${account.status}`}>
                        {account.status === 'active' ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td data-label="Saldo" className="number">
                      <strong>{money(account.balance ?? 0)}</strong>
                    </td>
                    <td data-label="Formas vinculadas">
                      {methods
                        .filter(
                          (method) => method.financialAccountId === account.id,
                        )
                        .map((method) => method.name)
                        .join(', ') || 'Nenhuma'}
                    </td>
                    {canManageAccounts && (
                      <td className="table-actions-cell" data-label="Ações">
                        {account.status === 'active' && (
                          <DeactivateAction
                            resource="financial-accounts"
                            id={account.id}
                            name={`a conta ${account.name}`}
                            onChanged={refresh}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="data-card">
        <div className="data-card-heading">
          <div>
            <h2>Formas de pagamento</h2>
            <p>
              Configurações usadas somente nas próximas operações; o histórico
              não muda.
            </p>
          </div>
          {canManageMethods && (
            <CreateMethod accounts={accounts} onCreated={refresh} />
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Conta de destino</th>
                <th className="number">Taxas</th>
                <th>Status</th>
                {canManageMethods && (
                  <th className="table-actions-column">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {methods.length === 0 ? (
                <tr className="table-empty-row">
                  <td className="table-empty-cell" colSpan={6}>
                    <strong>Nenhuma forma de pagamento</strong>
                    <p>
                      Cadastre PIX, dinheiro ou cartões para utilizar nas
                      vendas.
                    </p>
                  </td>
                </tr>
              ) : (
                methods.map((method) => (
                  <tr key={method.id}>
                    <td data-label="Nome">
                      <strong>{method.name}</strong>
                    </td>
                    <td data-label="Tipo">
                      {methodType[method.type] ?? method.type}
                    </td>
                    <td data-label="Conta">
                      {accounts.find(
                        (account) => account.id === method.financialAccountId,
                      )?.name ?? 'Sem vínculo'}
                    </td>
                    <td data-label="Taxas" className="number">
                      {method.feeRate
                        ? `${Number(method.feeRate).toLocaleString('pt-BR')}%`
                        : '0%'}
                      {method.feeFixed ? ` + ${money(method.feeFixed)}` : ''}
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge ${method.status}`}>
                        {method.status === 'active' ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    {canManageMethods && (
                      <td className="table-actions-cell" data-label="Ações">
                        {method.status === 'active' && (
                          <DeactivateAction
                            resource="payments/methods"
                            id={method.id}
                            name={`a forma ${method.name}`}
                            onChanged={refresh}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

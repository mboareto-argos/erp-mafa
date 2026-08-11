'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppIcon } from '@/components/layout/app-icon';
import { ListingTable } from '@/components/listings/listing-ui';
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

export type SupplierListItem = {
  id: string;
  name: string;
  document: string | null;
  contactName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: 'active' | 'inactive';
};

type PurchaseStatus =
  'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
type SupplierDetail = SupplierListItem & {
  summary: {
    purchasesCount: number;
    totalPurchased: string;
    averagePurchase: string;
    lastPurchaseAt: string | null;
    productsSupplied: number;
    outstandingBalance: string;
  };
  recentPurchases: Array<{
    id: string;
    status: PurchaseStatus;
    total: string;
    currency: string;
    createdAt: string;
    itemsCount: number;
  }>;
};

const money = (value: string | number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(
    Number(value),
  );
const date = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
    new Date(value),
  );
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
const purchaseStatus: Record<PurchaseStatus, string> = {
  draft: 'Rascunho',
  ordered: 'Confirmada',
  partially_received: 'Recebida parcialmente',
  received: 'Recebida',
  cancelled: 'Cancelada',
};

function SupplierForm({
  supplier,
  onClose,
}: {
  supplier?: SupplierListItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const optional = (name: string) =>
      formData.get(name)?.toString().trim() || null;
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(
        supplier
          ? `/api/purchasing/suppliers/${supplier.id}`
          : '/api/purchasing/suppliers',
        {
          method: supplier ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.get('name')?.toString().trim(),
            document: optional('document'),
            contactName: optional('contactName'),
            whatsapp: optional('whatsapp'),
            phone: optional('phone'),
            email: optional('email'),
          }),
        },
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          result.message ??
            `Não foi possível ${supplier ? 'editar' : 'cadastrar'} o fornecedor.`,
        );
      onClose();
      router.replace('/fornecedores');
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar o fornecedor.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="form-card supplier-workspace-form">
      <header className="form-card-heading">
        <div>
          <span className="wizard-eyebrow">Suprimentos</span>
          <h2>
            {supplier
              ? `Editar fornecedor · ${supplier.name}`
              : 'Novo fornecedor'}
          </h2>
          <p>
            Centralize identificação e contatos para agilizar compras e
            recebimentos.
          </p>
        </div>
        <button
          className="close-button"
          type="button"
          aria-label="Fechar cadastro"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <form onSubmit={submit} noValidate>
        <section className="wizard-form-section">
          <h3>Identificação</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="supplier-name">Nome do fornecedor</label>
              <input
                id="supplier-name"
                name="name"
                defaultValue={supplier?.name}
                required
                maxLength={160}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="supplier-document">
                Documento <small>(opcional)</small>
              </label>
              <input
                id="supplier-document"
                name="document"
                defaultValue={supplier?.document ?? ''}
                maxLength={32}
                placeholder="CPF, CNPJ ou documento estrangeiro"
              />
            </div>
          </div>
        </section>
        <section className="wizard-form-section">
          <h3>Contato comercial</h3>
          <div className="form-grid supplier-contact-grid">
            <div className="field">
              <label htmlFor="supplier-contact-name">
                Pessoa de contato <small>(opcional)</small>
              </label>
              <input
                id="supplier-contact-name"
                name="contactName"
                defaultValue={supplier?.contactName ?? ''}
                maxLength={160}
              />
            </div>
            <div className="field">
              <label htmlFor="supplier-whatsapp">
                WhatsApp <small>(opcional)</small>
              </label>
              <input
                id="supplier-whatsapp"
                name="whatsapp"
                defaultValue={supplier?.whatsapp ?? ''}
                inputMode="tel"
                autoComplete="tel"
                maxLength={32}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="field">
              <label htmlFor="supplier-phone">
                Telefone <small>(opcional)</small>
              </label>
              <input
                id="supplier-phone"
                name="phone"
                defaultValue={supplier?.phone ?? ''}
                inputMode="tel"
                autoComplete="tel"
                maxLength={32}
                placeholder="(11) 3333-3333"
              />
            </div>
            <div className="field">
              <label htmlFor="supplier-email">
                E-mail <small>(opcional)</small>
              </label>
              <input
                id="supplier-email"
                name="email"
                type="email"
                defaultValue={supplier?.email ?? ''}
                autoComplete="email"
                maxLength={254}
                placeholder="compras@fornecedor.com"
              />
            </div>
          </div>
        </section>
        <div className="supplier-history-note">
          <AppIcon name="purchases" />
          <p>
            Alterações cadastrais não modificam compras anteriores. O histórico
            operacional permanece vinculado ao fornecedor.
          </p>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="button button-primary compact-button"
            type="submit"
            disabled={pending}
          >
            {pending
              ? 'Salvando…'
              : supplier
                ? 'Salvar alterações'
                : 'Cadastrar fornecedor'}
          </button>
        </div>
      </form>
    </section>
  );
}

function SupplierDetails({
  supplier,
  open,
  onOpenChange,
}: {
  supplier: SupplierListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<SupplierDetail>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open || detail || error) return;
    let active = true;
    fetch(`/api/purchasing/suppliers/${supplier.id}`)
      .then(async (response) => {
        const result = (await response.json()) as SupplierDetail & {
          message?: string;
        };
        if (!response.ok)
          throw new Error(
            result.message ??
              'Não foi possível carregar a ficha do fornecedor.',
          );
        if (active) setDetail(result);
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : 'Não foi possível carregar a ficha do fornecedor.',
          );
      });
    return () => {
      active = false;
    };
  }, [detail, error, open, supplier.id]);

  const loading = open && !detail && !error;
  const summary = detail?.summary;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sale-detail-dialog supplier-detail-dialog">
        <header className="sale-detail-header">
          <div className="sale-detail-title">
            <span className="sale-detail-icon">
              <AppIcon name="suppliers" />
            </span>
            <div>
              <span className="sale-detail-eyebrow">Ficha do fornecedor</span>
              <DialogTitle>{supplier.name}</DialogTitle>
              <DialogDescription>
                {supplier.document ||
                  supplier.contactName ||
                  'Fornecedor sem identificação complementar'}
              </DialogDescription>
            </div>
          </div>
          <div className="sale-detail-header-actions">
            <span className={`status-badge ${supplier.status}`}>
              {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
            <DialogClose className="dialog-close" aria-label="Fechar">
              ×
            </DialogClose>
          </div>
        </header>
        <div className="sale-detail-layout">
          <div className="sale-detail-main">
            <section className="sale-detail-card supplier-contact-summary">
              <div>
                <span>Contato</span>
                <strong>{supplier.contactName || 'Não informado'}</strong>
              </div>
              <div>
                <span>WhatsApp</span>
                <strong>{supplier.whatsapp || 'Não informado'}</strong>
              </div>
              <div>
                <span>Telefone</span>
                <strong>{supplier.phone || 'Não informado'}</strong>
              </div>
              <div>
                <span>E-mail</span>
                <strong>{supplier.email || 'Não informado'}</strong>
              </div>
            </section>
            <section className="sale-detail-card sale-detail-section">
              <div className="sale-detail-section-heading">
                <div>
                  <span className="sale-detail-section-icon">
                    <AppIcon name="purchases" />
                  </span>
                  <div>
                    <h3>Compras recentes</h3>
                    <p>Últimas compras vinculadas a este fornecedor.</p>
                  </div>
                </div>
                {detail && <strong>{detail.recentPurchases.length}</strong>}
              </div>
              {loading ? (
                <div className="sale-detail-empty">
                  <span>…</span>
                  <p>Carregando histórico do fornecedor…</p>
                </div>
              ) : error ? (
                <div className="sale-detail-empty">
                  <span>!</span>
                  <p>
                    {error}{' '}
                    <button
                      className="button-link text-link"
                      type="button"
                      onClick={() => setError(undefined)}
                    >
                      Tentar novamente
                    </button>
                  </p>
                </div>
              ) : detail?.recentPurchases.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Compra</th>
                        <th>Data</th>
                        <th>Status</th>
                        <th className="number">Itens</th>
                        <th className="number">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.recentPurchases.map((purchase) => (
                        <tr key={purchase.id}>
                          <td data-label="Compra">
                            #{purchase.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td data-label="Data">
                            {dateTime(purchase.createdAt)}
                          </td>
                          <td data-label="Status">
                            <span className={`status-badge ${purchase.status}`}>
                              {purchaseStatus[purchase.status]}
                            </span>
                          </td>
                          <td className="number" data-label="Itens">
                            {purchase.itemsCount}
                          </td>
                          <td className="number" data-label="Total">
                            {money(purchase.total, purchase.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="sale-detail-empty">
                  <span>—</span>
                  <p>Nenhuma compra vinculada a este fornecedor.</p>
                </div>
              )}
            </section>
            <section className="sale-detail-card supplier-data-note">
              <AppIcon name="inventory" />
              <div>
                <h3>Histórico preservado</h3>
                <p>
                  Inativar o fornecedor impede novas seleções, mas não altera
                  compras, recebimentos, custos ou contas já registradas.
                </p>
              </div>
            </section>
          </div>
          <aside className="sale-financial-summary">
            <div className="sale-financial-heading">
              <span>Relacionamento comercial</span>
              <p>
                Indicadores consolidados em BRL a partir das operações
                existentes.
              </p>
            </div>
            <dl>
              <div>
                <dt>Compras válidas</dt>
                <dd>{summary?.purchasesCount ?? '—'}</dd>
              </div>
              <div>
                <dt>Compra média</dt>
                <dd>{summary ? money(summary.averagePurchase) : '—'}</dd>
              </div>
              <div>
                <dt>Produtos fornecidos</dt>
                <dd>{summary?.productsSupplied ?? '—'}</dd>
              </div>
              <div>
                <dt>Última compra</dt>
                <dd>
                  {summary?.lastPurchaseAt ? date(summary.lastPurchaseAt) : '—'}
                </dd>
              </div>
              <div>
                <dt>Saldo a pagar</dt>
                <dd>{summary ? money(summary.outstandingBalance) : '—'}</dd>
              </div>
            </dl>
            <div className="sale-financial-total">
              <span>Total comprado</span>
              <strong>{summary ? money(summary.totalPurchased) : '—'}</strong>
            </div>
            <div className="sale-detail-state draft">
              <AppIcon name="shield" />
              <p>
                Os valores são calculados no backend e restritos à empresa
                atual.
              </p>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SupplierRow({
  supplier,
  canManage,
  onEdit,
}: {
  supplier: SupplierListItem;
  canManage: boolean;
  onEdit: (supplier: SupplierListItem) => void;
}) {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function changeStatus() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/purchasing/suppliers/${supplier.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: supplier.status === 'active' ? 'deactivate' : 'activate',
          }),
        },
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          result.message ??
            'Não foi possível atualizar o status do fornecedor.',
        );
      setStatusOpen(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível atualizar o status do fornecedor.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <tr>
      <td data-label="Fornecedor">
        <strong>{supplier.name}</strong>
        {supplier.document && (
          <small className="table-detail">{supplier.document}</small>
        )}
      </td>
      <td data-label="Contato">{supplier.contactName || 'Não informado'}</td>
      <td data-label="WhatsApp">
        {supplier.whatsapp || supplier.phone || 'Não informado'}
      </td>
      <td data-label="E-mail">{supplier.email || 'Não informado'}</td>
      <td data-label="Status">
        <span className={`status-badge ${supplier.status}`}>
          {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="table-actions-cell" data-label="Ações">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="row-menu-trigger"
              type="button"
              aria-label={`Ações do fornecedor ${supplier.name}`}
            >
              <AppIcon name="more" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6}>
            <DropdownMenuItem
              className="dropdown-item view"
              onSelect={() => setDetailsOpen(true)}
            >
              <span>
                <AppIcon name="eye" />
              </span>
              <div>
                <strong>Visualizar</strong>
                <small>Ver ficha e compras</small>
              </div>
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem
                className="dropdown-item edit"
                onSelect={() => onEdit(supplier)}
              >
                <span>
                  <AppIcon name="edit" />
                </span>
                <div>
                  <strong>Editar cadastro</strong>
                  <small>Atualizar identificação e contato</small>
                </div>
              </DropdownMenuItem>
            )}
            {canManage && (
              <DropdownMenuItem
                className={`dropdown-item ${supplier.status === 'active' ? 'danger' : 'success'}`}
                onSelect={() => setStatusOpen(true)}
              >
                <span>
                  <AppIcon
                    name={supplier.status === 'active' ? 'cancel' : 'shield'}
                  />
                </span>
                <div>
                  <strong>
                    {supplier.status === 'active'
                      ? 'Inativar fornecedor'
                      : 'Reativar fornecedor'}
                  </strong>
                  <small>
                    {supplier.status === 'active'
                      ? 'Impedir novas compras'
                      : 'Disponibilizar novamente'}
                  </small>
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <SupplierDetails
          supplier={supplier}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
        {canManage && (
          <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
            <DialogContent>
              <div className="dialog-heading">
                <div>
                  <DialogTitle>
                    {supplier.status === 'active' ? 'Inativar' : 'Reativar'}{' '}
                    fornecedor?
                  </DialogTitle>
                  <DialogDescription>
                    {supplier.status === 'active'
                      ? 'Ele deixará de aparecer em novas compras, mas todo o histórico será preservado.'
                      : 'O fornecedor voltará a ficar disponível para novas compras.'}
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
                  className={`button ${supplier.status === 'active' ? 'button-danger' : 'button-primary compact-button'}`}
                  type="button"
                  disabled={pending}
                  onClick={changeStatus}
                >
                  {pending ? 'Salvando…' : 'Confirmar'}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </td>
    </tr>
  );
}

export function SupplierDirectory({
  suppliers,
  canManage,
  initialOpen = false,
  query,
}: {
  suppliers: SupplierListItem[];
  canManage: boolean;
  initialOpen?: boolean;
  query?: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(initialOpen);
  const [editing, setEditing] = useState<SupplierListItem>();
  const formOpen = creating || Boolean(editing);

  function closeForm() {
    setCreating(false);
    setEditing(undefined);
    if (initialOpen) router.replace('/fornecedores');
  }

  const rows =
    suppliers.length === 0 ? (
      <tr className="table-empty-row">
        <td className="table-empty-cell" colSpan={6}>
          <div className="table-empty-content">
            <span>
              <AppIcon name="suppliers" />
            </span>
            <strong>
              {query
                ? 'Nenhum fornecedor encontrado'
                : 'Nenhum fornecedor cadastrado ainda'}
            </strong>
            <p>
              {query
                ? 'Tente outro termo ou limpe a busca para visualizar todos os fornecedores.'
                : 'Cadastre o primeiro fornecedor para organizar compras e recebimentos.'}
            </p>
            {query ? (
              <a
                className="button button-secondary compact-button"
                href="/fornecedores"
              >
                Limpar busca
              </a>
            ) : canManage ? (
              <button
                className="button button-primary compact-button"
                type="button"
                onClick={() => setCreating(true)}
              >
                Cadastrar primeiro fornecedor
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    ) : (
      suppliers.map((supplier) => (
        <SupplierRow
          key={supplier.id}
          supplier={supplier}
          canManage={canManage}
          onEdit={setEditing}
        />
      ))
    );

  return (
    <section className="contact-directory supplier-directory">
      {canManage && formOpen && (
        <SupplierForm supplier={editing} onClose={closeForm} />
      )}
      {!formOpen && (
        <ListingTable
          headers={
            <>
              <th>Fornecedor</th>
              <th>Contato</th>
              <th>WhatsApp</th>
              <th>E-mail</th>
              <th>Status</th>
              <th className="table-actions-column">Ações</th>
            </>
          }
        >
          {rows}
        </ListingTable>
      )}
    </section>
  );
}

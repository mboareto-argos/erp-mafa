'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
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

export type ProductListItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  status: 'active' | 'inactive';
  minStock: string | null;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  variants: Array<{ id: string; skuVariant: string | null }>;
  prices: Array<{
    id: string;
    salePrice: string;
    costPrice: string;
    effectiveFrom: string;
  }>;
  stockAvailable?: string;
};

const money = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
const quantity = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(
    Number(value),
  );

function ProductDetails({
  product,
  open,
  onOpenChange,
}: {
  product: ProductListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [prices, setPrices] = useState(product.prices);
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch(`/api/catalog/products/${product.id}`)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((details: ProductListItem | undefined) => {
        if (active && details?.prices) setPrices(details.prices);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open, product.id]);
  const currentPrice = prices[0] ?? product.prices[0];
  const margin = currentPrice
    ? Number(currentPrice.salePrice) - Number(currentPrice.costPrice)
    : 0;
  const marginPercent =
    currentPrice && Number(currentPrice.salePrice) > 0
      ? (margin / Number(currentPrice.salePrice)) * 100
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sale-detail-dialog">
        <header className="sale-detail-header">
          <div className="sale-detail-title">
            <span className="sale-detail-icon">
              <AppIcon name="products" />
            </span>
            <div>
              <span className="sale-detail-eyebrow">Detalhes do produto</span>
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription>
                SKU principal: {product.sku}
              </DialogDescription>
            </div>
          </div>
          <div className="sale-detail-header-actions">
            <span className={`status-badge ${product.status}`}>
              {product.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
            <DialogClose className="dialog-close" aria-label="Fechar">
              ×
            </DialogClose>
          </div>
        </header>

        <div className="sale-detail-layout">
          <div className="sale-detail-main">
            <section className="sale-detail-card sale-detail-overview">
              <div>
                <span>Categoria</span>
                <strong>{product.category?.name ?? 'Sem categoria'}</strong>
              </div>
              <div>
                <span>Marca</span>
                <strong>{product.brand?.name ?? 'Sem marca'}</strong>
              </div>
              <div>
                <span>Unidade</span>
                <strong>{product.unit}</strong>
              </div>
            </section>

            <section className="sale-detail-card sale-detail-section">
              <div className="sale-detail-section-heading">
                <div>
                  <span className="sale-detail-section-icon">
                    <AppIcon name="products" />
                  </span>
                  <div>
                    <h3>Variações e identificação</h3>
                    <p>
                      Códigos utilizados nas operações de estoque, compra e
                      venda.
                    </p>
                  </div>
                </div>
                <strong>{product.variants.length}</strong>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Variação</th>
                      <th>SKU</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((variant, index) => (
                      <tr key={variant.id}>
                        <td data-label="Variação">
                          <strong>
                            {product.variants.length === 1
                              ? 'Padrão'
                              : `Variação ${index + 1}`}
                          </strong>
                        </td>
                        <td data-label="SKU">
                          {variant.skuVariant ?? product.sku}
                        </td>
                        <td data-label="Status">
                          <span className={`status-badge ${product.status}`}>
                            {product.status === 'active'
                              ? 'Disponível'
                              : 'Inativa'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="sale-detail-card sale-detail-section">
              <div className="sale-detail-section-heading">
                <div>
                  <span className="sale-detail-section-icon payment">
                    <AppIcon name="inventory" />
                  </span>
                  <div>
                    <h3>Controle de estoque</h3>
                    <p>
                      O saldo é derivado das movimentações e nunca editado neste
                      cadastro.
                    </p>
                  </div>
                </div>
              </div>
              <dl className="sale-payment-list">
                <div>
                  <dt>
                    <strong>Estoque mínimo</strong>
                    <small>Referência para alertas de reposição</small>
                  </dt>
                  <dd>
                    {product.minStock === null
                      ? 'Não definido'
                      : `${quantity(product.minStock)} ${product.unit}`}
                  </dd>
                </div>
                <div>
                  <dt>
                    <strong>Saldo disponível</strong>
                    <small>Calculado pelas movimentações registradas</small>
                  </dt>
                  <dd>
                    {product.stockAvailable === undefined
                      ? 'Sem acesso'
                      : `${quantity(product.stockAvailable)} ${product.unit}`}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="sale-detail-card sale-detail-section">
              <div className="sale-detail-section-heading">
                <div>
                  <span className="sale-detail-section-icon">
                    <AppIcon name="finance" />
                  </span>
                  <div>
                    <h3>Histórico de preços</h3>
                    <p>
                      Cada alteração cria um novo registro, sem sobrescrever o
                      anterior.
                    </p>
                  </div>
                </div>
                <strong>{prices.length}</strong>
              </div>
              {prices.length === 0 ? (
                <div className="sale-detail-empty">
                  <span>!</span>
                  <p>Nenhum preço de venda registrado para este produto.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Vigência</th>
                        <th className="number">Venda</th>
                        <th className="number">Custo calculado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prices.map((price) => (
                        <tr key={price.id}>
                          <td data-label="Vigência">
                            {new Intl.DateTimeFormat('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }).format(new Date(price.effectiveFrom))}
                          </td>
                          <td className="number" data-label="Venda">
                            {money(price.salePrice)}
                          </td>
                          <td className="number" data-label="Custo calculado">
                            {money(price.costPrice)}
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
              <span>Preço e custo</span>
              <p>Valores atuais do histórico do produto.</p>
            </div>
            <dl>
              <div>
                <dt>Preço de venda</dt>
                <dd>
                  {currentPrice
                    ? money(currentPrice.salePrice)
                    : 'Não informado'}
                </dd>
              </div>
              <div>
                <dt>Custo calculado</dt>
                <dd>
                  {currentPrice
                    ? money(currentPrice.costPrice)
                    : 'Sem recebimento'}
                </dd>
              </div>
              <div>
                <dt>Margem estimada</dt>
                <dd>{currentPrice ? money(margin) : '—'}</dd>
              </div>
            </dl>
            <div className="sale-financial-total">
              <span>Margem sobre a venda</span>
              <strong>
                {currentPrice
                  ? `${marginPercent.toFixed(1).replace('.', ',')}%`
                  : '—'}
              </strong>
            </div>
            <div className="sale-detail-state draft">
              <AppIcon name="shield" />
              <p>
                O custo é calculado automaticamente a partir dos recebimentos. A
                reprecificação altera apenas o preço de venda e preserva o
                histórico.
              </p>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RepriceProduct({
  product,
  open,
  onOpenChange,
}: {
  product: ProductListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/catalog/products/${product.id}/reprice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salePrice: Number(
              formData.get('salePrice')?.toString().replace(',', '.'),
            ),
            reason: formData.get('reason'),
          }),
        },
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          result.message ?? 'Não foi possível reprecificar o produto.',
        );
      onOpenChange(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível reprecificar o produto.',
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
            <DialogTitle>Reprecificar {product.name}</DialogTitle>
            <DialogDescription>
              O novo preço entra no histórico sem alterar o custo calculado do
              produto.
            </DialogDescription>
          </div>
          <DialogClose className="dialog-close" aria-label="Fechar">
            ×
          </DialogClose>
        </div>
        <form className="dialog-form" onSubmit={submit} noValidate>
          <CurrencyInput
            label="Novo preço de venda"
            name="salePrice"
            defaultValue={product.prices[0]?.salePrice}
            required
            min={0.01}
          />
          <div className="field">
            <label htmlFor={`reprice-reason-${product.id}`}>
              Motivo da alteração
            </label>
            <textarea
              id={`reprice-reason-${product.id}`}
              name="reason"
              required
              maxLength={500}
              placeholder="Ex.: ajuste de margem ou atualização de mercado"
            />
          </div>
          <p className="form-hint">
            O custo permanece derivado dos recebimentos e não pode ser digitado.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <DialogClose asChild>
              <button className="button button-secondary" type="button">
                Cancelar
              </button>
            </DialogClose>
            <button
              className="button button-primary compact-button"
              type="submit"
              disabled={pending}
            >
              {pending ? 'Salvando…' : 'Salvar novo preço'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeProductStatus({
  product,
  open,
  onOpenChange,
}: {
  product: ProductListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const deactivating = product.status === 'active';

  async function changeStatus() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/catalog/products/${product.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: deactivating ? 'deactivate' : 'activate',
          }),
        },
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          result.message ?? 'Não foi possível atualizar o status.',
        );
      onOpenChange(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível atualizar o status.',
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
              {deactivating ? 'Inativar' : 'Reativar'} produto?
            </DialogTitle>
            <DialogDescription>
              {deactivating
                ? 'Ele deixará de estar disponível para novas compras e vendas, mas todo o histórico será preservado.'
                : 'O produto voltará a ficar disponível para novas operações.'}
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
            className={`button ${deactivating ? 'button-danger' : 'button-primary compact-button'}`}
            type="button"
            onClick={changeStatus}
            disabled={pending}
          >
            {pending
              ? 'Salvando…'
              : deactivating
                ? 'Confirmar inativação'
                : 'Reativar produto'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProductRow({
  product,
  canManage,
}: {
  product: ProductListItem;
  canManage: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [repriceOpen, setRepriceOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <tr>
      <td data-label="Produto">
        <strong>{product.name}</strong>
        <small className="table-detail">Unidade: {product.unit}</small>
      </td>
      <td data-label="SKU">{product.sku}</td>
      <td data-label="Categoria">
        {product.category?.name ?? 'Sem categoria'}
      </td>
      <td className="number" data-label="Preço de venda">
        {product.prices[0]
          ? money(product.prices[0].salePrice)
          : 'Não informado'}
      </td>
      <td data-label="Status">
        <span className={`status-badge ${product.status}`}>
          {product.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="table-actions-cell" data-label="Ações">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="row-menu-trigger"
              type="button"
              aria-label={`Ações do produto ${product.name}`}
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
                <small>Ver ficha do produto</small>
              </div>
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem asChild>
                <Link
                  className="dropdown-item edit"
                  href={`/produtos?edit=${product.id}`}
                >
                  <span>
                    <AppIcon name="edit" />
                  </span>
                  <div>
                    <strong>Editar cadastro</strong>
                    <small>Nome, classificação e controle</small>
                  </div>
                </Link>
              </DropdownMenuItem>
            )}
            {canManage && (
              <DropdownMenuItem
                className="dropdown-item edit"
                onSelect={() => setRepriceOpen(true)}
              >
                <span>
                  <AppIcon name="finance" />
                </span>
                <div>
                  <strong>Reprecificar</strong>
                  <small>Gerar novo preço no histórico</small>
                </div>
              </DropdownMenuItem>
            )}
            {canManage && (
              <DropdownMenuItem
                className={`dropdown-item ${product.status === 'active' ? 'danger' : 'success'}`}
                onSelect={() => setStatusOpen(true)}
              >
                <span>
                  <AppIcon
                    name={product.status === 'active' ? 'cancel' : 'shield'}
                  />
                </span>
                <div>
                  <strong>
                    {product.status === 'active'
                      ? 'Inativar produto'
                      : 'Reativar produto'}
                  </strong>
                  <small>
                    {product.status === 'active'
                      ? 'Impedir novas operações'
                      : 'Disponibilizar novamente'}
                  </small>
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <ProductDetails
          product={product}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
        {canManage && (
          <>
            <RepriceProduct
              product={product}
              open={repriceOpen}
              onOpenChange={setRepriceOpen}
            />
            <ChangeProductStatus
              product={product}
              open={statusOpen}
              onOpenChange={setStatusOpen}
            />
          </>
        )}
      </td>
    </tr>
  );
}

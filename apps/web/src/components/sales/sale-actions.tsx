'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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

type Method = { id: string; name: string; status: string };

export type SaleListItem = {
  id: string;
  status: string;
  channel: string;
  subtotal: string;
  discount: string;
  total: string;
  cmvCalculated: string | null;
  grossProfitCalculated: string | null;
  createdAt: string;
  customer: { id: string; name: string } | null;
  items: Array<{
    id: string;
    productVariantId: string;
    quantity: string;
    quantityReturned: string;
    unitPrice: string;
    discount: string;
    productVariant?: {
      skuVariant: string | null;
      product: { name: string; sku: string };
    };
  }>;
  payments: Array<{
    id: string;
    amount: string;
    feeAmount: string;
    netAmount: string;
    paymentMethod: { name: string };
  }>;
  receivables: Array<{
    id: string;
    description: string;
    amountOriginal: string;
    amountReceived: string;
    dueDate: string;
    status: string;
    installmentNumber: number | null;
    installmentCount: number | null;
  }>;
};

const money = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  reserved: 'Reservada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  partially_returned: 'Devolvida parcialmente',
  returned: 'Devolvida',
};
const channelLabels: Record<string, string> = {
  presencial: 'Presencial',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  catalogo: 'Catálogo',
  outro: 'Outro',
};

function SaleDetails({
  sale,
  open,
  onOpenChange,
}: {
  sale: SaleListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const units = sale.items.reduce(
    (total, item) => total + Number(item.quantity),
    0,
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sale-detail-dialog">
        <header className="sale-detail-header">
          <div className="sale-detail-title">
            <span className="sale-detail-icon">
              <AppIcon name="sales" />
            </span>
            <div>
              <span className="sale-detail-eyebrow">Detalhes da venda</span>
              <DialogTitle>Venda #{sale.id.slice(0, 8)}</DialogTitle>
              <DialogDescription>
                Registrada em {dateTime(sale.createdAt)}
              </DialogDescription>
            </div>
          </div>
          <div className="sale-detail-header-actions">
            <span className={`status-badge ${sale.status}`}>
              {statusLabels[sale.status] ?? sale.status}
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
                <span>Cliente</span>
                <strong>{sale.customer?.name ?? 'Consumidor final'}</strong>
              </div>
              <div>
                <span>Canal de venda</span>
                <strong>{channelLabels[sale.channel] ?? sale.channel}</strong>
              </div>
              <div>
                <span>Quantidade</span>
                <strong>
                  {sale.items.length}{' '}
                  {sale.items.length === 1 ? 'item' : 'itens'} · {units} un.
                </strong>
              </div>
            </section>

            <section className="sale-detail-card sale-detail-section">
              <div className="sale-detail-section-heading">
                <div>
                  <span className="sale-detail-section-icon">
                    <AppIcon name="products" />
                  </span>
                  <div>
                    <h3>Itens da venda</h3>
                    <p>Produtos e valores registrados nesta operação.</p>
                  </div>
                </div>
                <strong>{sale.items.length}</strong>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th className="number">Qtd.</th>
                      <th className="number">Preço unit.</th>
                      <th className="number">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Produto">
                          <strong>
                            {item.productVariant?.product.name ?? 'Produto'}
                          </strong>
                          <span className="table-detail">
                            SKU:{' '}
                            {item.productVariant?.skuVariant ||
                              item.productVariant?.product.sku ||
                              '—'}
                          </span>
                        </td>
                        <td className="number" data-label="Quantidade">
                          {item.quantity}
                        </td>
                        <td className="number" data-label="Preço unitário">
                          {money(item.unitPrice)}
                        </td>
                        <td className="number" data-label="Total">
                          {money(
                            Number(item.quantity) * Number(item.unitPrice) -
                              Number(item.discount),
                          )}
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
                    <AppIcon name="finance" />
                  </span>
                  <div>
                    <h3>Pagamento</h3>
                    <p>Valores recebidos na hora e agenda de parcelas.</p>
                  </div>
                </div>
              </div>
              {sale.payments.length === 0 && sale.receivables.length === 0 ? (
                <div className="sale-detail-empty">
                  <span>!</span>
                  <p>
                    Pagamento ainda não registrado. Este rascunho precisa ser
                    concluído.
                  </p>
                </div>
              ) : (
                <dl className="sale-payment-list">
                  {sale.payments.map((payment) => (
                    <div key={payment.id}>
                      <dt>
                        <strong>{payment.paymentMethod.name}</strong>
                        <small>
                          {Number(payment.feeAmount) > 0
                            ? `Taxa: ${money(payment.feeAmount)}`
                            : 'Recebido na confirmação'}
                        </small>
                      </dt>
                      <dd>{money(payment.amount)}</dd>
                    </div>
                  ))}
                  {sale.receivables.map((receivable) => (
                    <div key={receivable.id}>
                      <dt>
                        <strong>
                          Parcela {receivable.installmentNumber}/
                          {receivable.installmentCount}
                        </strong>
                        <small>
                          Vence em{' '}
                          {new Intl.DateTimeFormat('pt-BR', {
                            timeZone: 'UTC',
                          }).format(new Date(receivable.dueDate))}{' '}
                          ·{' '}
                          {receivable.status === 'received'
                            ? 'recebida'
                            : receivable.status === 'cancelled'
                              ? 'cancelada'
                              : 'em aberto'}
                        </small>
                      </dt>
                      <dd>{money(receivable.amountOriginal)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          </div>

          <aside className="sale-financial-summary">
            <div className="sale-financial-heading">
              <span>Resumo financeiro</span>
              <p>Valores consolidados da venda.</p>
            </div>
            <dl>
              <div>
                <dt>Subtotal dos itens</dt>
                <dd>{money(sale.subtotal)}</dd>
              </div>
              <div className="discount">
                <dt>Desconto</dt>
                <dd>- {money(sale.discount)}</dd>
              </div>
            </dl>
            <div className="sale-financial-total">
              <span>Total da venda</span>
              <strong>{money(sale.total)}</strong>
            </div>
            <div className={`sale-detail-state ${sale.status}`}>
              <AppIcon
                name={sale.status === 'cancelled' ? 'cancel' : 'shield'}
              />
              <p>
                {sale.status === 'draft'
                  ? 'Rascunho sem movimentação de estoque ou caixa.'
                  : sale.status === 'reserved'
                    ? 'Estoque reservado para o cliente; ainda não baixado do disponível de outras vendas.'
                    : sale.status === 'cancelled'
                      ? 'Venda cancelada; histórico e estornos preservados.'
                      : 'Venda registrada no histórico operacional.'}
              </p>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CancelSale({
  saleId,
  open,
  onOpenChange,
}: {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function cancel() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/sales/${saleId}/cancel`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(result.message ?? 'Não foi possível cancelar a venda.');
      onOpenChange(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível cancelar a venda.',
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
            <DialogTitle>Cancelar venda?</DialogTitle>
            <DialogDescription>
              O registro continuará no histórico. Estoque e movimentação
              financeira serão estornados quando aplicável.
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
            onClick={cancel}
            disabled={pending}
          >
            {pending ? 'Cancelando…' : 'Confirmar cancelamento'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReturnSale({
  sale,
  open,
  onOpenChange,
}: {
  sale: SaleListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [reason, setReason] = useState('');
  const available = sale.items.filter(
    (item) => Number(item.quantity) > Number(item.quantityReturned),
  );
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(available.map((item) => [item.id, '0'])),
  );
  const [conditions, setConditions] = useState<
    Record<string, 'apt' | 'damaged'>
  >(() => Object.fromEntries(available.map((item) => [item.id, 'apt'])));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const items = available
      .map((item) => ({
        saleItemId: item.id,
        quantity: Number(quantities[item.id] || 0),
        condition: conditions[item.id],
      }))
      .filter((item) => item.quantity > 0);
    if (!items.length) return setError('Informe ao menos um item devolvido.');
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/sales/${sale.id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ reason, items }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          result.message ?? 'Não foi possível registrar a devolução.',
        );
      onOpenChange(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível registrar a devolução.',
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
            <DialogTitle>Registrar devolução</DialogTitle>
            <DialogDescription>
              Informe os itens e a condição. Produtos aptos voltam ao estoque;
              avariados ficam apenas no histórico.
            </DialogDescription>
          </div>
          <DialogClose className="dialog-close" aria-label="Fechar">
            ×
          </DialogClose>
        </div>
        <form className="dialog-form" onSubmit={submit}>
          <div className="return-items">
            {available.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>
                    {item.productVariant?.product.name ?? 'Produto'}
                  </strong>
                  <small>
                    Disponível para devolver:{' '}
                    {Number(item.quantity) - Number(item.quantityReturned)}
                  </small>
                </div>
                <div className="field">
                  <label htmlFor={`return-${item.id}`}>Quantidade</label>
                  <input
                    id={`return-${item.id}`}
                    type="number"
                    min="0"
                    max={Number(item.quantity) - Number(item.quantityReturned)}
                    step="0.001"
                    value={quantities[item.id]}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`condition-${item.id}`}>Condição</label>
                  <select
                    id={`condition-${item.id}`}
                    value={conditions[item.id]}
                    onChange={(event) =>
                      setConditions((current) => ({
                        ...current,
                        [item.id]: event.target.value as 'apt' | 'damaged',
                      }))
                    }
                  >
                    <option value="apt">Apto para voltar ao estoque</option>
                    <option value="damaged">Avariado</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="return-reason">Motivo</label>
            <textarea
              id="return-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              maxLength={500}
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
                Cancelar
              </button>
            </DialogClose>
            <button className="button button-primary" disabled={pending}>
              {pending ? 'Registrando…' : 'Confirmar devolução'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReserveSale({
  saleId,
  open,
  onOpenChange,
}: {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function reserve() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/sales/${saleId}/reserve`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(result.message ?? 'Não foi possível reservar a venda.');
      onOpenChange(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível reservar a venda.',
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
            <DialogTitle>Reservar venda?</DialogTitle>
            <DialogDescription>
              O estoque dos itens sai do disponível para outras vendas, mas
              continua no físico até a confirmação.
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
            className="button button-primary"
            type="button"
            onClick={reserve}
            disabled={pending}
          >
            {pending ? 'Reservando…' : 'Confirmar reserva'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmSale({
  sale,
  methods,
  open,
  onOpenChange,
}: {
  sale: SaleListItem;
  methods: Method[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [paymentMode, setPaymentMode] = useState<'immediate' | 'installments'>(
    'immediate',
  );
  const [methodId, setMethodId] = useState('');
  const [upfront, setUpfront] = useState('');
  const [installmentCount, setInstallmentCount] = useState('2');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const total = Number(sale.total);

  async function confirm() {
    setError(undefined);
    const method = methods.find((item) => item.id === methodId);
    if (paymentMode === 'immediate' && !method)
      return setError('Escolha a forma de pagamento.');
    if (paymentMode === 'installments' && !sale.customer)
      return setError(
        'Esta venda não tem cliente vinculado — edite o rascunho e informe um cliente antes de vender a prazo.',
      );
    if (paymentMode === 'installments' && !firstDueDate)
      return setError('Informe a primeira data de vencimento.');
    const immediateAmount =
      paymentMode === 'immediate'
        ? total
        : Math.min(Number(upfront || 0), total);
    if (immediateAmount > 0 && !method)
      return setError('Escolha a forma de pagamento da entrada.');
    setPending(true);
    try {
      const response = await fetch(`/api/sales/${sale.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          payments:
            immediateAmount > 0 && method
              ? [{ paymentMethodId: method.id, amount: immediateAmount }]
              : [],
          installmentPlan:
            paymentMode === 'installments' && immediateAmount < total
              ? { count: Number(installmentCount), firstDueDate }
              : undefined,
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          result.message ?? 'Não foi possível confirmar a venda.',
        );
      onOpenChange(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível confirmar a venda.',
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
            <DialogTitle>Confirmar venda?</DialogTitle>
            <DialogDescription>
              Estoque, CMV e pagamento serão registrados. A venda passa a compor
              o histórico operacional.
            </DialogDescription>
          </div>
          <DialogClose className="dialog-close" aria-label="Fechar">
            ×
          </DialogClose>
        </div>
        <fieldset className="payment-options">
          <legend>Quando o cliente vai pagar?</legend>
          <div>
            <label
              className={`payment-option${paymentMode === 'immediate' ? ' selected' : ''}`}
            >
              <input
                type="radio"
                checked={paymentMode === 'immediate'}
                onChange={() => {
                  setPaymentMode('immediate');
                  setUpfront('');
                }}
              />
              <span className="payment-radio" />
              <span>
                <strong>Receber agora</strong>
                <small>Registra a entrada no caixa imediatamente</small>
              </span>
            </label>
            <label
              className={`payment-option${paymentMode === 'installments' ? ' selected' : ''}`}
            >
              <input
                type="radio"
                checked={paymentMode === 'installments'}
                onChange={() => setPaymentMode('installments')}
              />
              <span className="payment-radio" />
              <span>
                <strong>Receber a prazo</strong>
                <small>Cria parcelas no contas a receber</small>
              </span>
            </label>
          </div>
        </fieldset>
        {(paymentMode === 'immediate' || Number(upfront || 0) > 0) && (
          <fieldset className="payment-options">
            <legend>
              {paymentMode === 'immediate'
                ? 'Forma de pagamento'
                : 'Forma de pagamento da entrada'}
            </legend>
            <div>
              {methods
                .filter((method) => method.status === 'active')
                .map((method) => (
                  <label
                    className={`payment-option${methodId === method.id ? ' selected' : ''}`}
                    key={method.id}
                  >
                    <input
                      type="radio"
                      name="confirm-payment-method"
                      checked={methodId === method.id}
                      onChange={() => setMethodId(method.id)}
                    />
                    <span className="payment-radio" aria-hidden="true" />
                    <span>
                      <strong>{method.name}</strong>
                      <small>
                        {methodId === method.id ? 'Selecionada' : 'Selecionar'}
                      </small>
                    </span>
                  </label>
                ))}
            </div>
          </fieldset>
        )}
        {paymentMode === 'installments' && (
          <div className="wizard-form-section">
            <div className="form-grid wizard-form-grid-three">
              <CurrencyInput
                label="Entrada agora"
                value={upfront}
                onValueChange={setUpfront}
                min={0}
                max={total}
                hint="Opcional; o restante será parcelado."
              />
              <div className="field">
                <label htmlFor="confirm-installments">Número de parcelas</label>
                <input
                  id="confirm-installments"
                  type="number"
                  min="1"
                  max="60"
                  value={installmentCount}
                  onChange={(event) => setInstallmentCount(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-first-due">Primeiro vencimento</label>
                <input
                  id="confirm-first-due"
                  type="date"
                  value={firstDueDate}
                  onChange={(event) => setFirstDueDate(event.target.value)}
                />
              </div>
            </div>
          </div>
        )}
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
            className="button button-primary"
            type="button"
            onClick={confirm}
            disabled={pending}
          >
            {pending ? 'Confirmando…' : 'Confirmar venda'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SaleActions({
  sale,
  canManage,
  methods,
}: {
  sale: SaleListItem;
  canManage: boolean;
  methods: Method[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const canEdit = canManage && sale.status === 'draft';
  const canReserve =
    canManage && sale.status === 'draft' && Boolean(sale.customer);
  const canCancel =
    canManage && ['draft', 'reserved', 'confirmed'].includes(sale.status);
  const canReturn =
    canManage && ['confirmed', 'partially_returned'].includes(sale.status);
  const canConfirm = canManage && ['draft', 'reserved'].includes(sale.status);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="row-menu-trigger"
            type="button"
            aria-label={`Ações da venda ${sale.id.slice(0, 8)}`}
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
              <small>Ver resumo completo</small>
            </div>
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem asChild>
              <Link
                className="dropdown-item edit"
                href={`/vendas?edit=${sale.id}`}
              >
                <span>
                  <AppIcon name="edit" />
                </span>
                <div>
                  <strong>Editar rascunho</strong>
                  <small>Revisar antes de concluir</small>
                </div>
              </Link>
            </DropdownMenuItem>
          )}
          {canReserve && (
            <DropdownMenuItem
              className="dropdown-item success"
              onSelect={() => setReserveOpen(true)}
            >
              <span>
                <AppIcon name="inventory" />
              </span>
              <div>
                <strong>Reservar estoque</strong>
                <small>Separar para o cliente sem confirmar</small>
              </div>
            </DropdownMenuItem>
          )}
          {canConfirm && (
            <DropdownMenuItem
              className="dropdown-item success"
              onSelect={() => setConfirmOpen(true)}
            >
              <span>
                <AppIcon name="shield" />
              </span>
              <div>
                <strong>Confirmar venda</strong>
                <small>Registrar pagamento e baixar estoque</small>
              </div>
            </DropdownMenuItem>
          )}
          {canReturn && (
            <DropdownMenuItem
              className="dropdown-item success"
              onSelect={() => setReturnOpen(true)}
            >
              <span>
                <AppIcon name="inventory" />
              </span>
              <div>
                <strong>Registrar devolução</strong>
                <small>Selecionar itens e condição</small>
              </div>
            </DropdownMenuItem>
          )}
          {canCancel && (
            <DropdownMenuItem
              className="dropdown-item danger"
              onSelect={() => setCancelOpen(true)}
            >
              <span>
                <AppIcon name="cancel" />
              </span>
              <div>
                <strong>Cancelar venda</strong>
                <small>Preservar histórico e estornar</small>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <SaleDetails
        sale={sale}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      {canReserve && (
        <ReserveSale
          saleId={sale.id}
          open={reserveOpen}
          onOpenChange={setReserveOpen}
        />
      )}
      {canConfirm && (
        <ConfirmSale
          sale={sale}
          methods={methods}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
        />
      )}
      {canCancel && (
        <CancelSale
          saleId={sale.id}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
      )}
      {canReturn && (
        <ReturnSale
          sale={sale}
          open={returnOpen}
          onOpenChange={setReturnOpen}
        />
      )}
    </>
  );
}

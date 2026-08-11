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
import { SelectField } from '@/components/ui/select-field';

export type InventoryMovement = {
  id: string;
  productVariantId: string;
  type: 'in' | 'out' | 'adjustment' | 'return' | 'reservation' | 'release';
  quantity: string;
  originType: 'purchase' | 'adjustment' | 'return' | 'sale';
  createdAt: string;
  adjustment: {
    reason: string;
    requiresApproval: boolean;
    approvedBy: string | null;
  } | null;
  productVariant?: {
    skuVariant: string | null;
    product: { name: string; sku: string };
  };
};

type Customer = { id: string; name: string; status: string };

type InventoryRow = {
  productVariantId: string;
  productName: string;
  sku: string;
  unit: string;
  quantityAvailable: string;
  quantityReserved: string;
  quantityInTransit: string;
  stockState: 'healthy' | 'low' | 'zero';
  currentPrice: string;
};

const quantity = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(
    Number(value),
  );
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
const movementLabel: Record<InventoryMovement['type'], string> = {
  in: 'Entrada',
  out: 'Saída',
  adjustment: 'Ajuste',
  return: 'Devolução',
  reservation: 'Reserva',
  release: 'Liberação de reserva',
};
const originLabel: Record<InventoryMovement['originType'], string> = {
  purchase: 'Compra',
  adjustment: 'Ajuste manual',
  return: 'Devolução',
  sale: 'Venda',
};

function InventoryDetails({
  row,
  movements,
  open,
  onOpenChange,
}: {
  row: InventoryRow;
  movements: InventoryMovement[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sale-detail-dialog inventory-detail-dialog">
        <header className="sale-detail-header">
          <div className="sale-detail-title">
            <span className="sale-detail-icon">
              <AppIcon name="inventory" />
            </span>
            <div>
              <span className="sale-detail-eyebrow">Posição de estoque</span>
              <DialogTitle>{row.productName}</DialogTitle>
              <DialogDescription>
                SKU: {row.sku} · Unidade: {row.unit}
              </DialogDescription>
            </div>
          </div>
          <div className="sale-detail-header-actions">
            <span className={`inventory-state-badge ${row.stockState}`}>
              {row.stockState === 'healthy'
                ? 'Regular'
                : row.stockState === 'low'
                  ? 'Estoque baixo'
                  : 'Sem estoque'}
            </span>
            <DialogClose className="dialog-close" aria-label="Fechar">
              ×
            </DialogClose>
          </div>
        </header>
        <div className="sale-detail-layout">
          <div className="sale-detail-main">
            <section className="sale-detail-card inventory-balance-summary">
              <div>
                <span>Disponível</span>
                <strong>
                  {quantity(row.quantityAvailable)} {row.unit}
                </strong>
              </div>
              <div>
                <span>Reservado</span>
                <strong>
                  {quantity(row.quantityReserved)} {row.unit}
                </strong>
              </div>
              <div>
                <span>Em trânsito</span>
                <strong>
                  {quantity(row.quantityInTransit)} {row.unit}
                </strong>
              </div>
            </section>
            <section className="sale-detail-card sale-detail-section">
              <div className="sale-detail-section-heading">
                <div>
                  <span className="sale-detail-section-icon">
                    <AppIcon name="inventory" />
                  </span>
                  <div>
                    <h3>Histórico de movimentações</h3>
                    <p>Registros imutáveis que formam o saldo atual.</p>
                  </div>
                </div>
                <strong>{movements.length}</strong>
              </div>
              {movements.length === 0 ? (
                <div className="sale-detail-empty">
                  <span>—</span>
                  <p>Este produto ainda não possui movimentações.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Origem</th>
                        <th>Motivo</th>
                        <th className="number">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement) => (
                        <tr key={movement.id}>
                          <td data-label="Data">
                            {dateTime(movement.createdAt)}
                          </td>
                          <td data-label="Tipo">
                            <span
                              className={`movement-type ${Number(movement.quantity) < 0 ? 'negative' : 'positive'}`}
                            >
                              {movementLabel[movement.type]}
                            </span>
                          </td>
                          <td data-label="Origem">
                            {originLabel[movement.originType]}
                          </td>
                          <td data-label="Motivo">
                            {movement.adjustment?.reason ?? '—'}
                          </td>
                          <td
                            className={`number movement-quantity ${Number(movement.quantity) < 0 ? 'negative' : 'positive'}`}
                            data-label="Quantidade"
                          >
                            {Number(movement.quantity) > 0 ? '+' : ''}
                            {quantity(movement.quantity)}
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
              <span>Como o saldo funciona</span>
              <p>
                O estoque é derivado das movimentações e não pode ser
                sobrescrito.
              </p>
            </div>
            <dl>
              <div>
                <dt>Entradas registradas</dt>
                <dd>
                  {movements.filter((item) => Number(item.quantity) > 0).length}
                </dd>
              </div>
              <div>
                <dt>Saídas registradas</dt>
                <dd>
                  {movements.filter((item) => Number(item.quantity) < 0).length}
                </dd>
              </div>
              <div>
                <dt>Ajustes manuais</dt>
                <dd>
                  {
                    movements.filter((item) => item.originType === 'adjustment')
                      .length
                  }
                </dd>
              </div>
            </dl>
            <div className="sale-detail-state draft">
              <AppIcon name="shield" />
              <p>
                Uma correção cria uma nova movimentação compensatória; registros
                anteriores permanecem no histórico.
              </p>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReserveStock({
  row,
  customers,
  open,
  onOpenChange,
}: {
  row: InventoryRow;
  customers: Customer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState('');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState(row.currentPrice);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const available = Number(row.quantityAvailable);
  const activeCustomers = customers.filter(
    (customer) => customer.status === 'active',
  );

  async function reserve() {
    setError(undefined);
    if (!customerId) return setError('Selecione um cliente para reservar.');
    const quantityValue = Number(qty);
    if (!quantityValue || quantityValue <= 0)
      return setError('Informe uma quantidade válida.');
    if (quantityValue > available)
      return setError('Quantidade maior que o disponível.');
    setPending(true);
    try {
      const created = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          channel: 'presencial',
          items: [
            {
              productVariantId: row.productVariantId,
              quantity: quantityValue,
              unitPrice: Number(unitPrice || 0),
            },
          ],
        }),
      });
      const sale = (await created.json()) as { id?: string; message?: string };
      if (!created.ok || !sale.id)
        throw new Error(
          sale.message ?? 'Não foi possível criar a venda para reserva.',
        );
      const reserved = await fetch(`/api/sales/${sale.id}/reserve`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      const result = (await reserved.json()) as { message?: string };
      if (!reserved.ok)
        throw new Error(
          result.message ?? 'Não foi possível reservar o estoque.',
        );
      onOpenChange(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível reservar o estoque.',
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
            <DialogTitle>Reservar estoque</DialogTitle>
            <DialogDescription>
              Separa {row.productName} para um cliente sem baixar do físico.
              Cria uma venda em rascunho já reservada.
            </DialogDescription>
          </div>
          <DialogClose className="dialog-close" aria-label="Fechar">
            ×
          </DialogClose>
        </div>
        <div className="dialog-form">
          <SelectField
            label="Cliente"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <option value="">Selecione um cliente</option>
            {activeCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </SelectField>
          <div className="form-grid wizard-form-grid-three">
            <div className="field">
              <label htmlFor="reserve-quantity">Quantidade</label>
              <input
                id="reserve-quantity"
                type="number"
                min="0.001"
                max={available}
                step="0.001"
                value={qty}
                onChange={(event) => setQty(event.target.value)}
              />
            </div>
            <CurrencyInput
              label="Preço unitário"
              value={unitPrice}
              onValueChange={setUnitPrice}
              min={0}
            />
          </div>
          <p className="table-detail">
            Disponível: {quantity(row.quantityAvailable)} {row.unit}
          </p>
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
            {pending ? 'Reservando…' : 'Reservar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryRowActions({
  row,
  movements,
  canAdjust,
  canReserve,
  customers,
}: {
  row: InventoryRow;
  movements: InventoryMovement[];
  canAdjust: boolean;
  canReserve: boolean;
  customers: Customer[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const hasAvailable = Number(row.quantityAvailable) > 0;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="row-menu-trigger"
            type="button"
            aria-label={`Ações de estoque para ${row.productName}`}
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
              <strong>Visualizar histórico</strong>
              <small>Entender a formação do saldo</small>
            </div>
          </DropdownMenuItem>
          {canReserve && hasAvailable && (
            <DropdownMenuItem
              className="dropdown-item success"
              onSelect={() => setReserveOpen(true)}
            >
              <span>
                <AppIcon name="inventory" />
              </span>
              <div>
                <strong>Reservar</strong>
                <small>Separar para um cliente</small>
              </div>
            </DropdownMenuItem>
          )}
          {canAdjust && (
            <DropdownMenuItem asChild>
              <Link
                className="dropdown-item edit"
                href={`/estoque?new=adjustment&variant=${row.productVariantId}`}
              >
                <span>
                  <AppIcon name="edit" />
                </span>
                <div>
                  <strong>Ajustar estoque</strong>
                  <small>Registrar entrada ou saída manual</small>
                </div>
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <InventoryDetails
        row={row}
        movements={movements}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      {canReserve && (
        <ReserveStock
          row={row}
          customers={customers}
          open={reserveOpen}
          onOpenChange={setReserveOpen}
        />
      )}
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrandMark } from '@/components/brand/brand-logo';
import { PrintButton } from '@/components/sales/print-button';
import { PRODUCT_NAME } from '@/lib/brand';
import { formatCents, toCents } from '@/lib/money';
import { ApiRequestError, backendRequest } from '@/lib/session';

type Receipt = {
  store: { name: string; document: string | null };
  number: string;
  date: string;
  status: 'confirmed' | 'partially_returned' | 'returned' | 'cancelled';
  customerName: string | null;
  items: {
    name: string;
    quantity: string;
    quantityReturned: string;
    unitPrice: string;
    discount: string;
    total: string;
    isGift: boolean;
  }[];
  subtotal: string;
  discount: string;
  total: string;
  payments: { method: string; amount: string }[];
  installments: {
    number: number | null;
    dueDate: string;
    amount: string;
    paid: string;
    status: string;
  }[];
};

// Página pública do recibo (BR §10.10, regra 26): única tela sem login. Não
// entra nos buscadores e só mostra o que a API devolve para o recibo.
export const metadata: Metadata = {
  title: 'Recibo',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const STATUS: Record<Receipt['status'], string | null> = {
  confirmed: null,
  partially_returned: 'Venda com devolução parcial',
  returned: 'Venda devolvida',
  cancelled: 'Venda cancelada',
};

const dateLabel = (iso: string, withTime = false) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    ...(withTime ? { timeStyle: 'short' } : {}),
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
const civilDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(iso));
const qty = (value: string) => Number(value).toLocaleString('pt-BR');
const money = (value: string) => formatCents(toCents(value));

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = (await backendRequest(
    `/public/receipts/${encodeURIComponent(token)}`,
  ).catch((error: unknown) => {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    throw error;
  })) as Receipt;
  const statusNote = STATUS[receipt.status];
  const discountCents = toCents(receipt.discount);

  return (
    <main className="mx-auto grid max-w-xl gap-4 px-4 py-6 print:max-w-none print:p-0">
      <article className="grid gap-5 rounded-lg border border-neutral-100 bg-neutral-0 p-5 print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              {receipt.store.name}
            </h1>
            {receipt.store.document && (
              <p className="text-xs text-neutral-500">
                CNPJ/CPF {receipt.store.document}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-neutral-500">
            <p className="font-semibold text-neutral-900">Recibo de venda</p>
            <p>Nº {receipt.number}</p>
            <p>{dateLabel(receipt.date, true)}</p>
          </div>
        </header>

        {statusNote && (
          <p className="rounded-md bg-warning-50 px-3 py-2 text-sm font-semibold text-neutral-900">
            {statusNote}
          </p>
        )}

        {receipt.customerName && (
          <p className="text-sm text-neutral-700">
            Cliente:{' '}
            <strong className="text-neutral-900">{receipt.customerName}</strong>
          </p>
        )}

        {/* Lista (não <table>): o CSS global vira tabelas em cartões no celular. */}
        <ul className="grid divide-y divide-neutral-100 border-y border-neutral-100 text-sm">
          {receipt.items.map((item, index) => (
            <li
              key={index}
              className="flex items-start justify-between gap-3 py-2"
            >
              <span className="min-w-0">
                <span className="block text-neutral-900">
                  {qty(item.quantity)} × {item.name}
                </span>
                <span className="block text-xs text-neutral-500">
                  {item.isGift
                    ? 'Brinde'
                    : `${money(item.unitPrice)} cada${
                        toCents(item.discount) > 0
                          ? ` · desconto ${money(item.discount)}`
                          : ''
                      }`}
                  {Number(item.quantityReturned) > 0
                    ? ` · ${qty(item.quantityReturned)} devolvido(s)`
                    : ''}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-neutral-900">
                {item.isGift ? 'Grátis' : money(item.total)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="grid gap-1 text-sm">
          {discountCents > 0 && (
            <div className="flex justify-between text-neutral-700">
              <dt>Desconto</dt>
              <dd className="tabular-nums">− {money(receipt.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold text-neutral-900">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(receipt.total)}</dd>
          </div>
        </dl>

        {receipt.payments.length > 0 && (
          <section className="grid gap-1 text-sm">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase">
              Pagamento
            </h2>
            {receipt.payments.map((payment, index) => (
              <p key={index} className="flex justify-between">
                <span>{payment.method}</span>
                <span className="tabular-nums">{money(payment.amount)}</span>
              </p>
            ))}
          </section>
        )}

        {receipt.installments.length > 0 && (
          <section className="grid gap-1 text-sm">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase">
              Parcelas a pagar
            </h2>
            {receipt.installments.map((installment, index) => (
              <p key={index} className="flex justify-between">
                <span>
                  {installment.number ? `${installment.number}ª · ` : ''}
                  vence em {civilDate(installment.dueDate)}
                  {installment.status === 'received' ? ' · paga' : ''}
                </span>
                <span className="tabular-nums">
                  {money(installment.amount)}
                </span>
              </p>
            ))}
          </section>
        )}

        <footer className="grid gap-1 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          <p className="font-semibold">Não é documento fiscal.</p>
          <p className="flex items-center gap-1">
            <BrandMark size={14} /> Emitido pelo {PRODUCT_NAME}
          </p>
        </footer>
      </article>

      <div className="print:hidden">
        <PrintButton />
      </div>
    </main>
  );
}

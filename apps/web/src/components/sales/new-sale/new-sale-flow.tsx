'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  Calculator,
  ChevronLeft,
  CreditCard,
  HandCoins,
  Minus,
  PackageSearch,
  Plus,
  QrCode,
  ScanBarcode,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { notify } from '@/components/ui/toaster';
import { centsToDecimal, formatCents, toCents } from '@/lib/money';
import { cn } from '@/lib/utils';
import { CustomerPicker, type PickerCustomer } from './customer-picker';
import {
  addToCart,
  cartTotals,
  confirmPayload,
  installmentSchedule,
  paymentFee,
  paymentProblem,
  searchProducts,
  setQuantity,
  setUnitPrice,
  type CartLine,
  type CatalogProduct,
  type Payment,
  type PaymentMethod,
} from './sale-math';

type Draft = {
  id: string;
  channel: string;
  discount: string;
  customerId: string;
  items: { productVariantId: string; quantity: string; unitPrice: string }[];
};

const STEPS = ['Itens', 'Pagamento', 'Confirmar'] as const;
const DRAFT_KEY = 'erp_mafa_nova_venda';
const CHANNELS: Record<string, string> = {
  presencial: 'Presencial',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  catalogo: 'Catálogo',
  outro: 'Outro',
};
const METHOD_ICONS: Record<string, LucideIcon> = {
  pix: QrCode,
  cash: Banknote,
  credit_card: CreditCard,
  debit_card: CreditCard,
};
const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`));
const isoInDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

// Nova venda em tela cheia (DS §8.10): Itens → Pagamento → Confirmar, com o
// total e a ação principal sempre visíveis no rodapé. Tudo o que a venda vai
// gerar (estoque, recebimento, parcelas) aparece antes de confirmar.
export function NewSaleFlow({
  products,
  methods,
  customers: initialCustomers,
  stock,
  accounts,
  canCreateCustomer,
  draft,
}: {
  products: CatalogProduct[];
  methods: PaymentMethod[];
  customers: PickerCustomer[];
  stock: Record<string, number> | null;
  accounts: Record<string, string>;
  canCreateCustomer: boolean;
  draft: Draft | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState<CartLine[]>(() =>
    draft
      ? draft.items.flatMap((item) => {
          const product = products.find((candidate) =>
            candidate.variants.some(
              (variant) => variant.id === item.productVariantId,
            ),
          );
          return product
            ? [
                {
                  productId: product.id,
                  variantId: item.productVariantId,
                  name: product.name,
                  sku: product.sku,
                  unitPriceCents: toCents(item.unitPrice),
                  quantity: Number(item.quantity),
                },
              ]
            : [];
        })
      : [],
  );
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState(draft?.customerId ?? '');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [discountCents, setDiscountCents] = useState(toCents(draft?.discount));
  const [channel, setChannel] = useState(draft?.channel ?? 'presencial');
  const [editingPrice, setEditingPrice] = useState<string>();
  const [saleId, setSaleId] = useState(draft?.id);
  const [idempotencyKey, setIdempotencyKey] = useState<string>();
  const [pending, setPending] = useState<'confirm' | 'draft'>();
  const [error, setError] = useState<string>();
  const [restored, setRestored] = useState(false);

  // Rascunho local: fechar a aba sem querer não perde o carrinho
  // (DS §3.2, princípio 4). Só para venda nova; rascunho do servidor já
  // está salvo na API.
  useEffect(() => {
    if (draft) return;
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as {
        cart?: CartLine[];
        customerId?: string;
        channel?: string;
        discountCents?: number;
      } | null;
      // Restaura uma única vez após montar: localStorage não existe no
      // servidor, então não dá para usar como estado inicial sem quebrar a
      // hidratação.
      /* eslint-disable react-hooks/set-state-in-effect */
      if (saved?.cart?.length) {
        setCart(saved.cart);
        setCustomerId(saved.customerId ?? '');
        setChannel(saved.channel ?? 'presencial');
        setDiscountCents(saved.discountCents ?? 0);
        setRestored(true);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // armazenamento indisponível (aba privada etc.): segue sem rascunho
    }
  }, [draft]);

  useEffect(() => {
    if (draft) return;
    try {
      if (cart.length === 0) localStorage.removeItem(DRAFT_KEY);
      else
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ cart, customerId, channel, discountCents }),
        );
    } catch {
      // idem
    }
  }, [draft, cart, customerId, channel, discountCents]);

  const totals = cartTotals(cart, discountCents);
  const results = useMemo(
    () => searchProducts(products, query),
    [products, query],
  );
  const shownResults = results.slice(0, 30);
  const methodById = (id: string) => methods.find((method) => method.id === id);
  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId,
  );
  const stockShortage = stock
    ? cart.filter((line) => line.quantity > (stock[line.variantId] ?? 0))
    : [];

  function add(product: CatalogProduct) {
    setCart((current) => addToCart(current, product));
    setError(undefined);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Leitor de código de barras USB/Bluetooth "digita" o código + Enter:
    // adiciona direto o primeiro resultado (SKU exato vem primeiro).
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (query.trim() && results[0]) {
      add(results[0]);
      setQuery('');
    }
  }

  function choose(next: Payment) {
    setPayment(next);
    setError(undefined);
  }

  function goNext() {
    setError(undefined);
    if (step === 0) {
      if (cart.length === 0) return setError('Adicione pelo menos um produto.');
      if (cart.some((line) => line.unitPriceCents <= 0))
        return setError('Informe o preço de todos os itens.');
    }
    if (step === 1) {
      const problem = paymentProblem(payment, totals.total, customerId);
      if (problem) return setError(problem);
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  }

  function goBack() {
    setError(undefined);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function saveSale() {
    const response = await fetch(
      saleId ? `/api/sales/${saleId}` : '/api/sales',
      {
        method: saleId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          channel,
          discount: Number(centsToDecimal(totals.discount)),
          items: cart.map((line) => ({
            productVariantId: line.variantId,
            quantity: line.quantity,
            unitPrice: Number(centsToDecimal(line.unitPriceCents)),
            discount: 0,
          })),
        }),
      },
    );
    const body = (await response.json()) as {
      id?: string;
      total?: string;
      message?: string;
    };
    if (!response.ok || !body.id)
      throw new Error(body.message ?? 'Não foi possível salvar a venda.');
    // Reaproveita a mesma venda em novas tentativas: nunca duplica.
    setSaleId(body.id);
    return { id: body.id, totalCents: toCents(body.total) };
  }

  function finish(message: string, description?: string) {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // idem
    }
    notify.success(message, description);
    router.push('/vendas');
    router.refresh();
  }

  async function confirm() {
    if (!payment) return;
    setPending('confirm');
    setError(undefined);
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    try {
      const sale = await saveSale();
      const response = await fetch(`/api/sales/${sale.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(confirmPayload(sale.totalCents, payment)),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        // Nova tentativa depois de corrigir algo precisa de outra chave.
        setIdempotencyKey(undefined);
        throw new Error(body.message ?? 'Não foi possível confirmar a venda.');
      }
      finish(
        'Venda registrada',
        `${formatCents(sale.totalCents)}${selectedCustomer ? ` · ${selectedCustomer.name}` : ''}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível confirmar a venda.',
      );
    } finally {
      setPending(undefined);
    }
  }

  async function saveDraft() {
    if (cart.length === 0) return;
    setPending('draft');
    setError(undefined);
    try {
      await saveSale();
      finish('Rascunho salvo', 'Você pode concluir a venda depois em Vendas.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar o rascunho.',
      );
    } finally {
      setPending(undefined);
    }
  }

  const fee =
    payment?.mode === 'now'
      ? paymentFee(totals.total, methodById(payment.methodId))
      : null;
  const schedule =
    payment?.mode === 'credit'
      ? installmentSchedule(
          totals.total - Math.min(payment.upfrontCents, totals.total),
          payment.count,
          payment.firstDueDate,
        )
      : [];

  if (methods.length === 0)
    return (
      <main className="page-content">
        <div className="grid max-w-xl gap-3 rounded-lg border border-warning-600/30 bg-warning-50 p-5">
          <strong className="text-lg text-neutral-900">
            Falta configurar uma forma de pagamento
          </strong>
          <p className="text-sm text-neutral-700">
            Cadastre Pix, dinheiro ou cartão em Financeiro antes de registrar a
            primeira venda.
          </p>
          <Button asChild variant="secondary" className="justify-self-start">
            <Link href="/financeiro">Ir para Financeiro</Link>
          </Button>
        </div>
      </main>
    );

  return (
    <main className="new-sale-flow page-content flex min-h-[calc(100dvh-60px)] flex-col !pb-0 sm:min-h-[calc(100dvh-72px)]">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-brand-accent-hover uppercase">
            {draft ? 'Rascunho de venda' : 'Vendas'}
          </p>
          <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
            Nova venda
          </h1>
        </div>
        <div className="flex items-center gap-1">
          {cart.length > 0 && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              loading={pending === 'draft'}
              disabled={Boolean(pending)}
              onClick={saveDraft}
            >
              Salvar rascunho
            </Button>
          )}
          <Button
            asChild
            variant="tertiary"
            size="icon"
            aria-label="Fechar e voltar para Vendas"
          >
            <Link href="/vendas">
              <X aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </header>

      <ol className="mb-5 grid grid-cols-3 gap-2" aria-label="Etapas da venda">
        {STEPS.map((label, index) => (
          <li key={label} aria-current={index === step ? 'step' : undefined}>
            <span
              className={cn(
                'block h-1.5 rounded-full bg-neutral-100',
                index <= step && 'bg-brand-accent',
              )}
            />
            <span
              className={cn(
                'mt-1.5 block text-xs font-semibold text-neutral-500',
                index === step && 'text-neutral-900',
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      {restored && step === 0 && (
        <div
          className="mb-4 flex items-center justify-between gap-3 rounded-md bg-info-50 px-3 py-2 text-sm text-neutral-700"
          role="status"
        >
          <span>Recuperamos o carrinho que você estava montando.</span>
          <button
            type="button"
            className="font-semibold text-info-600"
            onClick={() => {
              setCart([]);
              setCustomerId('');
              setDiscountCents(0);
              setRestored(false);
            }}
          >
            Começar do zero
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="grid min-w-0 grid-cols-1 gap-5">
          {step === 0 && (
            <>
              {cart.length > 0 && (
                <section
                  aria-labelledby="cart-title"
                  className="rounded-lg border border-neutral-100 bg-neutral-0"
                >
                  <h2
                    id="cart-title"
                    className="border-b border-neutral-100 px-4 py-3 text-md font-semibold text-neutral-900"
                  >
                    No carrinho · {plural(totals.units, 'item', 'itens')}
                  </h2>
                  <ul className="divide-y divide-neutral-100">
                    {cart.map((line) => {
                      const available = stock?.[line.variantId];
                      const short =
                        available !== undefined && line.quantity > available;
                      return (
                        <li
                          key={line.variantId}
                          className="grid gap-2 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <strong className="block text-md font-semibold text-neutral-900">
                                {line.name}
                              </strong>
                              <button
                                type="button"
                                className="text-left text-sm text-neutral-500 underline decoration-dotted underline-offset-2"
                                onClick={() =>
                                  setEditingPrice(
                                    editingPrice === line.variantId
                                      ? undefined
                                      : line.variantId,
                                  )
                                }
                                aria-expanded={editingPrice === line.variantId}
                              >
                                {formatCents(line.unitPriceCents)} cada ·
                                alterar preço
                              </button>
                            </div>
                            <strong className="shrink-0 text-md font-semibold text-neutral-900 tabular-nums">
                              {formatCents(line.unitPriceCents * line.quantity)}
                            </strong>
                          </div>
                          {editingPrice === line.variantId && (
                            <CurrencyInput
                              label={`Preço de ${line.name} nesta venda`}
                              value={centsToDecimal(line.unitPriceCents)}
                              onValueChange={(value) =>
                                setCart((current) =>
                                  setUnitPrice(
                                    current,
                                    line.variantId,
                                    toCents(value),
                                  ),
                                )
                              }
                              hint="Vale só para esta venda; o preço do produto não muda."
                            />
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <div
                              className="flex items-center rounded-full border border-neutral-200"
                              role="group"
                              aria-label={`Quantidade de ${line.name}`}
                            >
                              <button
                                type="button"
                                className="grid size-11 place-items-center rounded-full text-neutral-700 hover:bg-neutral-50"
                                onClick={() =>
                                  setCart((current) =>
                                    setQuantity(
                                      current,
                                      line.variantId,
                                      line.quantity - 1,
                                    ),
                                  )
                                }
                                aria-label={
                                  line.quantity === 1
                                    ? `Remover ${line.name}`
                                    : `Diminuir ${line.name}`
                                }
                              >
                                {line.quantity === 1 ? (
                                  <X className="size-5" aria-hidden="true" />
                                ) : (
                                  <Minus
                                    className="size-5"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                              <span
                                className="w-8 text-center text-md font-semibold tabular-nums"
                                aria-live="polite"
                              >
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                className="grid size-11 place-items-center rounded-full text-neutral-700 hover:bg-neutral-50"
                                onClick={() =>
                                  setCart((current) =>
                                    setQuantity(
                                      current,
                                      line.variantId,
                                      line.quantity + 1,
                                    ),
                                  )
                                }
                                aria-label={`Aumentar ${line.name}`}
                              >
                                <Plus className="size-5" aria-hidden="true" />
                              </button>
                            </div>
                            {short && (
                              <span className="rounded-sm bg-warning-50 px-2 py-1 text-xs font-semibold text-warning-600">
                                Só {available} em estoque
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section
                aria-labelledby="add-title"
                className="grid min-w-0 grid-cols-1 gap-3"
              >
                <h2
                  id="add-title"
                  className="text-md font-semibold text-neutral-900"
                >
                  {cart.length > 0
                    ? 'Adicionar mais produtos'
                    : 'O que o cliente está levando?'}
                </h2>
                <div className="relative">
                  <PackageSearch
                    className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-neutral-300"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Buscar por nome ou código"
                    aria-label="Buscar produto por nome ou código"
                    autoComplete="off"
                    className="h-12 w-full rounded-md border border-neutral-200 bg-neutral-0 pr-11 pl-10 text-md text-neutral-900 focus:border-brand-accent focus:outline-none"
                  />
                  <ScanBarcode
                    className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-neutral-300"
                    aria-hidden="true"
                  />
                </div>
                <ul
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  aria-label="Produtos"
                >
                  {shownResults.map((product) => {
                    const variantId = product.variants[0].id;
                    const available = stock?.[variantId];
                    const inCart =
                      cart.find((line) => line.variantId === variantId)
                        ?.quantity ?? 0;
                    return (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => add(product)}
                          className={cn(
                            'flex min-h-16 w-full items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-0 px-3 py-2 text-left transition-colors duration-[120ms] hover:border-brand-accent focus-visible:outline-2 focus-visible:outline-brand-accent active:bg-brand-accent-subtle',
                            inCart > 0 &&
                              'border-brand-accent bg-brand-accent-subtle',
                          )}
                          aria-label={`Adicionar ${product.name}${inCart ? ` (${inCart} no carrinho)` : ''}`}
                        >
                          <span className="min-w-0 flex-1">
                            <strong className="line-clamp-2 text-sm font-semibold text-neutral-900">
                              {product.name}
                            </strong>
                            <span className="block text-xs text-neutral-500">
                              {product.sku}
                              {available !== undefined && (
                                <>
                                  {' · '}
                                  <span
                                    className={cn(
                                      available <= 0 &&
                                        'font-semibold text-danger-600',
                                    )}
                                  >
                                    {available <= 0
                                      ? 'Sem estoque'
                                      : `${available} em estoque`}
                                  </span>
                                </>
                              )}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <strong className="block text-sm font-semibold text-neutral-900 tabular-nums">
                              {formatCents(
                                toCents(product.prices[0]?.salePrice),
                              )}
                            </strong>
                            {inCart > 0 ? (
                              <span className="text-xs font-semibold text-brand-accent-hover">
                                {inCart} no carrinho
                              </span>
                            ) : (
                              <Plus
                                className="ml-auto size-4 text-brand-accent-hover"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {results.length === 0 && (
                  <p className="rounded-md bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
                    Nenhum produto com &quot;{query}&quot;. Confira o nome ou
                    cadastre o produto em Produtos.
                  </p>
                )}
                {results.length > shownResults.length && (
                  <p className="text-center text-xs text-neutral-500">
                    Mostrando {shownResults.length} de {results.length}. Digite
                    mais para refinar.
                  </p>
                )}
              </section>
            </>
          )}

          {step === 1 && (
            <>
              <section
                aria-labelledby="customer-title"
                className="grid min-w-0 grid-cols-1 gap-2"
              >
                <h2
                  id="customer-title"
                  className="text-md font-semibold text-neutral-900"
                >
                  Para quem é a venda?
                </h2>
                <CustomerPicker
                  customers={customers}
                  value={customerId}
                  onChange={setCustomerId}
                  onCreated={(customer) =>
                    setCustomers((current) => [...current, customer])
                  }
                  canCreate={canCreateCustomer}
                  required={payment?.mode === 'credit'}
                />
                {!customerId && payment?.mode !== 'credit' && (
                  <p className="text-xs text-neutral-500">
                    Sem cliente, a venda fica como &quot;Consumidor final&quot;.
                  </p>
                )}
              </section>

              <section
                aria-labelledby="payment-title"
                className="grid min-w-0 grid-cols-1 gap-3"
              >
                <h2
                  id="payment-title"
                  className="text-md font-semibold text-neutral-900"
                >
                  Como o cliente vai pagar?
                </h2>
                <div
                  className="grid grid-cols-2 gap-2"
                  role="radiogroup"
                  aria-labelledby="payment-title"
                >
                  {methods.map((method) => {
                    const Icon = METHOD_ICONS[method.type] ?? Wallet;
                    const active =
                      payment?.mode === 'now' && payment.methodId === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() =>
                          choose({ mode: 'now', methodId: method.id })
                        }
                        className={cn(
                          'flex min-h-14 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-0 px-3 text-left text-sm font-semibold text-neutral-900 focus-visible:outline-2 focus-visible:outline-brand-accent',
                          active &&
                            'border-brand-accent bg-brand-accent-subtle',
                        )}
                      >
                        <Icon
                          className="size-5 shrink-0 text-brand-accent-hover"
                          aria-hidden="true"
                        />
                        {method.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={payment?.mode === 'credit'}
                    onClick={() =>
                      choose({
                        mode: 'credit',
                        count: 1,
                        firstDueDate: isoInDays(30),
                        upfrontCents: 0,
                        upfrontMethodId: '',
                      })
                    }
                    className={cn(
                      'flex min-h-14 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-0 px-3 text-left text-sm font-semibold text-neutral-900 focus-visible:outline-2 focus-visible:outline-brand-accent',
                      payment?.mode === 'credit' &&
                        'border-brand-accent bg-brand-accent-subtle',
                    )}
                  >
                    <HandCoins
                      className="size-5 shrink-0 text-brand-accent-hover"
                      aria-hidden="true"
                    />
                    Fiado / a prazo
                  </button>
                </div>

                {fee && fee.fee > 0 && payment?.mode === 'now' && (
                  <CalculatedBox title="Taxa da forma de pagamento">
                    <Row
                      label={`Taxa (${String(methodById(payment.methodId)?.feeRate ?? 0).replace('.', ',')}%)`}
                      value={`− ${formatCents(fee.fee)}`}
                    />
                    <Row
                      label="Você recebe"
                      value={formatCents(fee.net)}
                      strong
                    />
                  </CalculatedBox>
                )}

                {payment?.mode === 'credit' && (
                  <div className="grid gap-4 rounded-lg border border-neutral-100 bg-neutral-0 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="text-sm font-semibold text-neutral-700"
                        id="installments-label"
                      >
                        Em quantas vezes?
                      </span>
                      <div
                        className="flex items-center rounded-full border border-neutral-200"
                        role="group"
                        aria-labelledby="installments-label"
                      >
                        <button
                          type="button"
                          className="grid size-11 place-items-center rounded-full disabled:opacity-40"
                          disabled={payment.count <= 1}
                          onClick={() =>
                            choose({ ...payment, count: payment.count - 1 })
                          }
                          aria-label="Menos parcelas"
                        >
                          <Minus className="size-5" aria-hidden="true" />
                        </button>
                        <span
                          className="w-10 text-center font-semibold tabular-nums"
                          aria-live="polite"
                        >
                          {payment.count}x
                        </span>
                        <button
                          type="button"
                          className="grid size-11 place-items-center rounded-full disabled:opacity-40"
                          disabled={payment.count >= 12}
                          onClick={() =>
                            choose({ ...payment, count: payment.count + 1 })
                          }
                          aria-label="Mais parcelas"
                        >
                          <Plus className="size-5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <label className="grid gap-1 text-sm font-semibold text-neutral-700">
                      Quando vence a primeira?
                      <input
                        type="date"
                        value={payment.firstDueDate}
                        onChange={(event) =>
                          choose({
                            ...payment,
                            firstDueDate: event.target.value,
                          })
                        }
                        className="h-11 rounded-md border border-neutral-200 px-3 font-normal text-neutral-900"
                      />
                    </label>
                    <CurrencyInput
                      label="Entrada (opcional)"
                      value={
                        payment.upfrontCents
                          ? centsToDecimal(payment.upfrontCents)
                          : ''
                      }
                      onValueChange={(value) =>
                        choose({ ...payment, upfrontCents: toCents(value) })
                      }
                      hint="Valor que o cliente já pagou agora."
                    />
                    {payment.upfrontCents > 0 && (
                      <div className="grid gap-2">
                        <span className="text-sm font-semibold text-neutral-700">
                          Como pagou a entrada?
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {methods.map((method) => (
                            <button
                              key={method.id}
                              type="button"
                              aria-pressed={
                                payment.upfrontMethodId === method.id
                              }
                              onClick={() =>
                                choose({
                                  ...payment,
                                  upfrontMethodId: method.id,
                                })
                              }
                              className={cn(
                                'min-h-11 rounded-full border border-neutral-200 px-4 text-sm font-semibold text-neutral-700',
                                payment.upfrontMethodId === method.id &&
                                  'border-brand-accent bg-brand-accent-subtle text-neutral-900',
                              )}
                            >
                              {method.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {schedule.length > 0 && (
                      <CalculatedBox title="Parcelas que serão geradas">
                        {schedule.map((installment) => (
                          <Row
                            key={installment.number}
                            label={`${installment.number}ª · vence ${dateLabel(installment.dueDate)}`}
                            value={formatCents(installment.cents)}
                          />
                        ))}
                      </CalculatedBox>
                    )}
                  </div>
                )}
              </section>

              <details className="group rounded-lg border border-neutral-100 bg-neutral-0">
                <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 text-sm font-semibold text-neutral-700">
                  Mais opções: desconto e canal
                  <span className="text-xs font-normal text-neutral-500">
                    {totals.discount > 0
                      ? `Desconto ${formatCents(totals.discount)} · `
                      : ''}
                    {CHANNELS[channel] ?? channel}
                  </span>
                </summary>
                <div className="grid gap-4 border-t border-neutral-100 p-4">
                  <CurrencyInput
                    label="Desconto na venda"
                    value={discountCents ? centsToDecimal(discountCents) : ''}
                    onValueChange={(value) => setDiscountCents(toCents(value))}
                    hint={
                      totals.subtotal
                        ? `Subtotal ${formatCents(totals.subtotal)}`
                        : undefined
                    }
                  />
                  <div className="grid gap-2">
                    <span className="text-sm font-semibold text-neutral-700">
                      Onde a venda aconteceu?
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(CHANNELS).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={channel === value}
                          onClick={() => setChannel(value)}
                          className={cn(
                            'min-h-11 rounded-full border border-neutral-200 px-4 text-sm font-semibold text-neutral-700',
                            channel === value &&
                              'border-brand-accent bg-brand-accent-subtle text-neutral-900',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </>
          )}

          {step === 2 && payment && (
            <section
              aria-labelledby="review-title"
              className="grid min-w-0 grid-cols-1 gap-4"
            >
              <h2
                id="review-title"
                className="text-md font-semibold text-neutral-900"
              >
                Confira antes de confirmar
              </h2>
              <div className="rounded-lg border border-neutral-100 bg-neutral-0">
                <ul className="divide-y divide-neutral-100">
                  {cart.map((line) => (
                    <li
                      key={line.variantId}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <span className="min-w-0">
                        <strong className="block truncate font-semibold text-neutral-900">
                          {line.name}
                        </strong>
                        <span className="text-neutral-500">
                          {line.quantity} × {formatCents(line.unitPriceCents)}
                        </span>
                      </span>
                      <strong className="shrink-0 tabular-nums">
                        {formatCents(line.unitPriceCents * line.quantity)}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-2 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-700">
                <strong className="text-neutral-900">
                  O que esta venda vai fazer:
                </strong>
                <ul className="grid list-disc gap-1 pl-5">
                  <li>
                    Baixar {plural(totals.units, 'unidade', 'unidades')} do
                    estoque.
                  </li>
                  <li>
                    Cliente: {selectedCustomer?.name ?? 'Consumidor final'} ·{' '}
                    {CHANNELS[channel] ?? channel}.
                  </li>
                  {payment.mode === 'now' ? (
                    <li>
                      Receber {formatCents(totals.total)} via{' '}
                      {methodById(payment.methodId)?.name}
                      {fee && fee.fee > 0
                        ? ` (você recebe ${formatCents(fee.net)} após a taxa)`
                        : ''}
                      {methodById(payment.methodId)?.financialAccountId &&
                      accounts[
                        methodById(payment.methodId)!.financialAccountId!
                      ]
                        ? `, que entra em ${accounts[methodById(payment.methodId)!.financialAccountId!]}`
                        : ''}
                      .
                    </li>
                  ) : (
                    <>
                      {payment.upfrontCents > 0 && (
                        <li>
                          Receber a entrada de{' '}
                          {formatCents(payment.upfrontCents)} via{' '}
                          {methodById(payment.upfrontMethodId)?.name}.
                        </li>
                      )}
                      <li>
                        Lançar {plural(schedule.length, 'parcela', 'parcelas')}{' '}
                        a receber de {selectedCustomer?.name}:{' '}
                        {schedule
                          .map(
                            (item) =>
                              `${formatCents(item.cents)} em ${dateLabel(item.dueDate)}`,
                          )
                          .join('; ')}
                        .
                      </li>
                    </>
                  )}
                </ul>
              </div>
              {stockShortage.length > 0 && (
                <p
                  className="rounded-md bg-warning-50 px-4 py-3 text-sm text-neutral-900"
                  role="status"
                >
                  <strong>Atenção ao estoque:</strong>{' '}
                  {stockShortage
                    .map(
                      (line) =>
                        `${line.name} (${stock?.[line.variantId] ?? 0} disponível)`,
                    )
                    .join(', ')}
                  . A venda pode ser recusada se a empresa não permite estoque
                  negativo.
                </p>
              )}
            </section>
          )}
        </div>

        <aside
          className="hidden lg:sticky lg:top-24 lg:block"
          aria-label="Resumo da venda"
        >
          <div className="grid gap-3 rounded-lg border border-neutral-100 bg-neutral-0 p-4 shadow-sm">
            <strong className="text-md text-neutral-900">Resumo</strong>
            <Row label="Itens" value={String(totals.units)} />
            <Row label="Subtotal" value={formatCents(totals.subtotal)} />
            {totals.discount > 0 && (
              <Row
                label="Desconto"
                value={`− ${formatCents(totals.discount)}`}
              />
            )}
            <Row
              label="Cliente"
              value={selectedCustomer?.name ?? 'Consumidor final'}
            />
            <div className="border-t border-neutral-100 pt-3">
              <Row label="Total" value={formatCents(totals.total)} strong />
            </div>
          </div>
        </aside>
      </div>

      <footer className="sticky bottom-0 z-20 -mx-4.5 mt-auto border-t border-neutral-100 bg-neutral-0/95 px-4.5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-8 sm:px-8">
        {error && (
          <p
            role="alert"
            className="mb-2 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
          >
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="px-3"
              onClick={goBack}
              disabled={Boolean(pending)}
              aria-label="Voltar uma etapa"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <span className="block text-xs text-neutral-500">
              Total · {plural(totals.units, 'item', 'itens')}
            </span>
            <strong className="block truncate text-xl font-bold sm:text-2xl text-neutral-900 tabular-nums">
              {formatCents(totals.total)}
            </strong>
          </div>
          {step < 2 ? (
            <Button
              type="button"
              size="lg"
              onClick={goNext}
              disabled={cart.length === 0}
            >
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={confirm}
              loading={pending === 'confirm'}
              disabled={Boolean(pending)}
            >
              Confirmar venda
            </Button>
          )}
        </div>
      </footer>
    </main>
  );
}

// Valor calculado pelo sistema: visualmente diferente de campo digitável
// (DS-FORM-004) — fundo neutro, ícone de calculadora, sem borda de input.
function CalculatedBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 rounded-md bg-neutral-50 p-3 text-sm">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
        <Calculator className="size-4" aria-hidden="true" />
        {title} · calculado
      </span>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-700">{label}</span>
      <span
        className={cn(
          'tabular-nums text-neutral-900',
          strong && 'text-lg font-bold',
        )}
      >
        {value}
      </span>
    </div>
  );
}

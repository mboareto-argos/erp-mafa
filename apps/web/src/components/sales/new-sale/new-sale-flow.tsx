'use client';

import { ProductImage } from '@/components/catalog/product-image';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  CreditCard,
  Gift,
  HandCoins,
  Plus,
  QrCode,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { notify } from '@/components/ui/toaster';
import { centsToDecimal, formatCents, toCents } from '@/lib/money';
import { cn } from '@/lib/utils';
import { BarcodeScanner } from '@/components/scanner/barcode-scanner';
import { ProductSheet } from '@/components/scanner/product-sheet';
import { ScanSearchField } from '@/components/scanner/scan-search-field';
import { UnknownCodeSheet } from '@/components/scanner/unknown-code-sheet';
import { findByCode } from '@/lib/catalog';
import {
  CalculatedBox,
  Stepper,
  SummaryRow,
  TaskFlow,
  TaskFlowFooter,
  TaskFlowHeader,
  TaskFlowSteps,
} from '@/components/flow/task-flow';
import {
  ContactPicker,
  type PickerContact,
} from '@/components/forms/contact-picker';
import {
  addToCart,
  cartTotals,
  confirmPayload,
  installmentSchedule,
  linePrice,
  paymentFee,
  paymentProblem,
  searchProducts,
  setGift,
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
  items: {
    productVariantId: string;
    quantity: string;
    unitPrice: string;
    isGift?: boolean;
  }[];
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
  products: initialProducts,
  methods,
  customers: initialCustomers,
  stock,
  accounts,
  canCreateCustomer,
  canManageCatalog = false,
  initialAdd,
  draft,
}: {
  products: CatalogProduct[];
  methods: PaymentMethod[];
  customers: PickerContact[];
  stock: Record<string, number> | null;
  accounts: Record<string, string>;
  canCreateCustomer: boolean;
  /** Pode vincular código de barras a produto ou cadastrar produto (manage_catalog). */
  canManageCatalog?: boolean;
  /** Variação a colocar no carrinho ao abrir (ex.: "Vender" na página do produto). */
  initialAdd?: string;
  draft: Draft | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState(initialProducts);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState<CatalogProduct | null>(null);
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const withInitialAdd = (lines: CartLine[]) => {
    const product = initialAdd
      ? initialProducts.find((candidate) =>
          candidate.variants.some((variant) => variant.id === initialAdd),
        )
      : undefined;
    return product && !lines.some((line) => line.variantId === initialAdd)
      ? addToCart(lines, product)
      : lines;
  };
  const [cart, setCart] = useState<CartLine[]>(() =>
    draft
      ? draft.items.flatMap((item) => {
          const product = initialProducts.find((candidate) =>
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
                  // Brinde volta com preço zero da API: guarda o preço do
                  // produto para quando desmarcar.
                  unitPriceCents: item.isGift
                    ? toCents(product.prices[0]?.salePrice)
                    : toCents(item.unitPrice),
                  quantity: Number(item.quantity),
                  isGift: Boolean(item.isGift),
                },
              ]
            : [];
        })
      : withInitialAdd([]),
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
      // Só conta como "recuperado" se havia algo além do produto que veio
      // pela página do produto (?adicionar=).
      if (saved?.cart?.some((line) => line.variantId !== initialAdd)) {
        setCart(withInitialAdd(saved.cart));
        setCustomerId(saved.customerId ?? '');
        setChannel(saved.channel ?? 'presencial');
        setDiscountCents(saved.discountCents ?? 0);
        setRestored(true);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // armazenamento indisponível (aba privada etc.): segue sem rascunho
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restaura só ao montar
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

  // Leitor de código de barras USB/Bluetooth "digita" o código + Enter:
  // adiciona direto o primeiro resultado (código exato vem primeiro).
  function addFirstResult() {
    if (query.trim() && results[0]) {
      add(results[0]);
      setQuery('');
    }
  }

  // Câmera: produto conhecido abre a ficha com preço/estoque e "Adicionar
  // ao carrinho"; código desconhecido oferece vincular ou cadastrar.
  function onScanned(code: string) {
    setScannerOpen(false);
    const product = findByCode(products, code);
    if (product) setScanned(product);
    else setUnknownCode(code);
  }

  function addScanned(product: CatalogProduct, quantity: number) {
    setCart((current) => {
      const withProduct = addToCart(current, product);
      const line = withProduct.find(
        (item) => item.variantId === product.variants[0].id,
      )!;
      return setQuantity(
        withProduct,
        line.variantId,
        line.quantity - 1 + quantity,
      );
    });
    setScanned(null);
    setError(undefined);
    notify.success('Adicionado ao carrinho', `${quantity} × ${product.name}`);
  }

  function choose(next: Payment) {
    setPayment(next);
    setError(undefined);
  }

  function goNext() {
    setError(undefined);
    if (step === 0) {
      if (cart.length === 0) return setError('Adicione pelo menos um produto.');
      if (cart.some((line) => !line.isGift && line.unitPriceCents <= 0))
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
            unitPrice: Number(centsToDecimal(linePrice(line))),
            discount: 0,
            isGift: Boolean(line.isGift),
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
    <TaskFlow>
      <TaskFlowHeader
        eyebrow={draft ? 'Rascunho de venda' : 'Vendas'}
        title="Nova venda"
        closeHref="/vendas"
        closeLabel="Fechar e voltar para Vendas"
        actions={
          cart.length > 0 && (
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
          )
        }
      />

      <TaskFlowSteps steps={STEPS} current={step} label="Etapas da venda" />

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
                              {line.isGift ? (
                                <span className="text-sm text-brand-accent-hover">
                                  Brinde · sai de graça, o custo conta no lucro
                                </span>
                              ) : (
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
                                  aria-expanded={
                                    editingPrice === line.variantId
                                  }
                                >
                                  {formatCents(line.unitPriceCents)} cada ·
                                  alterar preço
                                </button>
                              )}
                            </div>
                            <strong className="shrink-0 text-md font-semibold text-neutral-900 tabular-nums">
                              {line.isGift
                                ? 'Grátis'
                                : formatCents(
                                    line.unitPriceCents * line.quantity,
                                  )}
                            </strong>
                          </div>
                          {!line.isGift && editingPrice === line.variantId && (
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
                            <Stepper
                              value={line.quantity}
                              min={1}
                              label={`Quantidade de ${line.name}`}
                              decreaseLabel={`Diminuir ${line.name}`}
                              increaseLabel={`Aumentar ${line.name}`}
                              removeLabel={`Remover ${line.name}`}
                              onChange={(quantity) =>
                                setCart((current) =>
                                  setQuantity(
                                    current,
                                    line.variantId,
                                    quantity,
                                  ),
                                )
                              }
                            />
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {short && (
                                <span className="rounded-sm bg-warning-50 px-2 py-1 text-xs font-semibold text-warning-600">
                                  Só {available} em estoque
                                </span>
                              )}
                              <button
                                type="button"
                                aria-pressed={Boolean(line.isGift)}
                                onClick={() => {
                                  setEditingPrice(undefined);
                                  setCart((current) =>
                                    setGift(
                                      current,
                                      line.variantId,
                                      !line.isGift,
                                    ),
                                  );
                                }}
                                className={cn(
                                  'inline-flex min-h-10 items-center gap-1 rounded-md border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-accent',
                                  line.isGift
                                    ? 'border-brand-accent bg-brand-accent-subtle text-neutral-900'
                                    : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50',
                                )}
                              >
                                <Gift className="size-4" aria-hidden="true" />
                                Brinde
                              </button>
                            </div>
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
                <ScanSearchField
                  value={query}
                  onChange={setQuery}
                  onEnter={addFirstResult}
                  onScan={() => setScannerOpen(true)}
                  placeholder="Buscar por nome ou código"
                />
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
                          <ProductImage
                            src={product.imageUrl}
                            alt=""
                            className="size-11"
                          />
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
                <ContactPicker
                  kind="customer"
                  contacts={customers}
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
                    <SummaryRow
                      label={`Taxa (${String(methodById(payment.methodId)?.feeRate ?? 0).replace('.', ',')}%)`}
                      value={`− ${formatCents(fee.fee)}`}
                    />
                    <SummaryRow
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
                      <Stepper
                        value={payment.count}
                        min={1}
                        max={12}
                        label="Número de parcelas"
                        decreaseLabel="Menos parcelas"
                        increaseLabel="Mais parcelas"
                        format={(count) => `${count}x`}
                        onChange={(count) => choose({ ...payment, count })}
                      />
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
                          <SummaryRow
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
                          {line.isGift
                            ? `${line.quantity} × brinde`
                            : `${line.quantity} × ${formatCents(line.unitPriceCents)}`}
                        </span>
                      </span>
                      <strong className="shrink-0 tabular-nums">
                        {line.isGift
                          ? 'Grátis'
                          : formatCents(line.unitPriceCents * line.quantity)}
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
            <SummaryRow label="Itens" value={String(totals.units)} />
            <SummaryRow label="Subtotal" value={formatCents(totals.subtotal)} />
            {totals.discount > 0 && (
              <SummaryRow
                label="Desconto"
                value={`− ${formatCents(totals.discount)}`}
              />
            )}
            <SummaryRow
              label="Cliente"
              value={selectedCustomer?.name ?? 'Consumidor final'}
            />
            <div className="border-t border-neutral-100 pt-3">
              <SummaryRow
                label="Total"
                value={formatCents(totals.total)}
                strong
              />
            </div>
          </div>
        </aside>
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={onScanned}
      />
      <ProductSheet
        product={scanned}
        stock={
          scanned && stock ? (stock[scanned.variants[0].id] ?? 0) : undefined
        }
        inCart={
          scanned
            ? (cart.find((line) => line.variantId === scanned.variants[0].id)
                ?.quantity ?? 0)
            : 0
        }
        onOpenChange={(open) => !open && setScanned(null)}
        onAdd={addScanned}
        onScanNext={() => {
          setScanned(null);
          setScannerOpen(true);
        }}
      />
      <UnknownCodeSheet
        code={unknownCode}
        products={products}
        canManageCatalog={canManageCatalog}
        onOpenChange={(open) => !open && setUnknownCode(null)}
        onResolved={(product, how) => {
          setProducts((current) =>
            how === 'created'
              ? [...current, product]
              : current.map((item) =>
                  item.id === product.id ? product : item,
                ),
          );
          setUnknownCode(null);
          setScanned(product);
          notify.success(
            how === 'created' ? 'Produto cadastrado' : 'Código vinculado',
            product.name,
          );
        }}
      />

      <TaskFlowFooter
        error={error}
        onBack={step > 0 ? goBack : undefined}
        backDisabled={Boolean(pending)}
        summaryLabel={`Total · ${plural(totals.units, 'item', 'itens')}`}
        summaryValue={formatCents(totals.total)}
      >
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
            aria-label="Confirmar venda"
            type="button"
            size="lg"
            onClick={confirm}
            loading={pending === 'confirm'}
            disabled={Boolean(pending)}
          >
            Confirmar<span className="hidden sm:inline"> venda</span>
          </Button>
        )}
      </TaskFlowFooter>
    </TaskFlow>
  );
}

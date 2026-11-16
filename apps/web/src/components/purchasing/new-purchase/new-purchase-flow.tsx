'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  CircleSlash,
  Landmark,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  Plus,
  ScanBarcode,
  Truck,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { QuickProductForm } from '@/components/catalog/quick-product-form';
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
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { notify } from '@/components/ui/toaster';
import { searchProducts, type CatalogProduct } from '@/lib/catalog';
import { installmentSchedule } from '@/lib/installments';
import { centsToDecimal, formatCents, toCents } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  addToPurchase,
  finalUnitCosts,
  linesProblem,
  paymentProblem,
  purchaseTotals,
  receivePayload,
  suggestedSku,
  updateLine,
  type Arrival,
  type PurchaseLine,
  type PurchasePayment,
} from './purchase-math';

type Draft = {
  id: string;
  supplierId: string;
  items: {
    productVariantId: string;
    quantity: string;
    unitCostOriginCurrency: string;
  }[];
};
type SavedPurchase = {
  id: string;
  items: { id: string; productVariantId: string; quantity: string }[];
  payables?: { id: string; amountOriginal: string }[];
};
/** Até onde a compra já foi gravada — nova tentativa continua dali, nunca duplica. */
type Progress = {
  purchase?: SavedPurchase;
  ordered?: boolean;
  received?: boolean;
  payableId?: string;
  payableAmount?: string;
};

const STEPS = ['Itens', 'Chegada', 'Confirmar'] as const;
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;
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

// Nova compra em tela cheia: o que chegou (com cadastro de produto e
// fornecedor ali mesmo) → se já chegou e como foi pago → confirmar.
// Mesma moldura e regras visuais da Nova venda (DS §8.10).
export function NewPurchaseFlow({
  products: initialProducts,
  suppliers: initialSuppliers,
  accounts,
  canCreateProduct,
  canCreateSupplier,
  canPay,
  draft,
}: {
  products: CatalogProduct[];
  suppliers: PickerContact[];
  accounts: { id: string; name: string }[];
  canCreateProduct: boolean;
  canCreateSupplier: boolean;
  canPay: boolean;
  draft: Draft | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState(initialProducts);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierId, setSupplierId] = useState(draft?.supplierId ?? '');
  const [lines, setLines] = useState<PurchaseLine[]>(() =>
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
                  quantity: Number(item.quantity),
                  unitCostCents: toCents(item.unitCostOriginCurrency),
                },
              ]
            : [];
        })
      : [],
  );
  const [query, setQuery] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [freightCents, setFreightCents] = useState(0);
  const [payment, setPayment] = useState<PurchasePayment | null>(null);
  const [progress, setProgress] = useState<Progress>(
    draft ? { purchase: { id: draft.id, items: [] } } : {},
  );
  const [keys, setKeys] = useState<{ receive?: string; pay?: string }>({});
  const [pending, setPending] = useState<'confirm' | 'draft'>();
  const [error, setError] = useState<string>();

  const freight = arrival === 'arrived' ? freightCents : 0;
  const totals = purchaseTotals(lines, freight);
  const results = useMemo(
    () => searchProducts(products, query),
    [products, query],
  );
  const shownResults = results.slice(0, 30);
  const finalCosts = finalUnitCosts(lines, freight);
  const selectedSupplier = suppliers.find(
    (supplier) => supplier.id === supplierId,
  );
  const account =
    payment?.mode === 'paid'
      ? accounts.find((item) => item.id === payment.accountId)
      : undefined;
  const schedule =
    payment?.mode === 'later'
      ? installmentSchedule(totals.total, payment.count, payment.firstDueDate)
      : [];
  // Depois que o pedido foi gravado a compra não é mais rascunho: itens e
  // valores não podem mudar (a API recusa), só concluir.
  const locked = Boolean(progress.ordered);

  function add(product: CatalogProduct) {
    setLines((current) => addToPurchase(current, product));
    setError(undefined);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Leitor de código de barras: código + Enter. Produto conhecido entra na
    // compra; código desconhecido abre o cadastro já com o código preenchido.
    if (event.key !== 'Enter' || !query.trim()) return;
    event.preventDefault();
    if (results[0]) {
      add(results[0]);
      setQuery('');
    } else if (canCreateProduct) {
      setCreatingProduct(true);
    }
  }

  function goNext() {
    setError(undefined);
    const problem =
      step === 0
        ? linesProblem(lines)
        : step === 1
          ? paymentProblem(arrival, payment, supplierId)
          : null;
    if (problem) return setError(problem);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  }

  async function request<T>(
    url: string,
    init: RequestInit,
    fallback: string,
  ): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
    const body = (await response.json().catch(() => ({}))) as T & {
      message?: string;
    };
    if (!response.ok) throw new Error(body.message ?? fallback);
    return body;
  }

  async function savePurchase(): Promise<SavedPurchase> {
    const id = progress.purchase?.id;
    const saved = await request<SavedPurchase>(
      id ? `/api/purchasing/purchases/${id}` : '/api/purchasing/purchases',
      {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify({
          supplierId: supplierId || undefined,
          items: lines.map((line) => ({
            productVariantId: line.variantId,
            quantity: line.quantity,
            unitCostOriginCurrency: Number(centsToDecimal(line.unitCostCents)),
          })),
        }),
      },
      'Não foi possível salvar a compra.',
    );
    setProgress((current) => ({ ...current, purchase: saved }));
    return saved;
  }

  function finish(message: string, description?: string) {
    notify.success(message, description);
    router.push('/compras');
    router.refresh();
  }

  async function confirm() {
    if (!arrival) return;
    setPending('confirm');
    setError(undefined);
    let state = progress;
    try {
      if (!state.ordered) {
        const purchase = await savePurchase();
        await request(
          `/api/purchasing/purchases/${purchase.id}/order`,
          { method: 'POST' },
          'Não foi possível registrar o pedido.',
        );
        state = { ...state, purchase, ordered: true };
        setProgress(state);
      }
      const purchase = state.purchase!;
      if (arrival === 'transit') {
        return finish(
          'Pedido registrado',
          `${plural(totals.units, 'unidade', 'unidades')} em trânsito`,
        );
      }

      const effectivePayment = payment ?? { mode: 'none' as const };
      if (!state.received) {
        const receiveKey = keys.receive ?? crypto.randomUUID();
        setKeys((current) => ({ ...current, receive: receiveKey }));
        const received = await request<SavedPurchase>(
          `/api/purchasing/purchases/${purchase.id}/receive`,
          {
            method: 'POST',
            headers: { 'Idempotency-Key': receiveKey },
            body: JSON.stringify(
              receivePayload(
                purchase.items,
                freight,
                effectivePayment,
                isoInDays(0),
              ),
            ),
          },
          'Não foi possível dar entrada no estoque.',
        ).catch((cause: Error) => {
          setKeys((current) => ({ ...current, receive: undefined }));
          throw cause;
        });
        state = {
          ...state,
          received: true,
          payableId: received.payables?.[0]?.id,
          payableAmount: received.payables?.[0]?.amountOriginal,
        };
        setProgress(state);
      }

      if (effectivePayment.mode === 'paid' && state.payableId) {
        const payKey = keys.pay ?? crypto.randomUUID();
        setKeys((current) => ({ ...current, pay: payKey }));
        try {
          await request(
            `/api/finance/payables/${state.payableId}/pay`,
            {
              method: 'POST',
              headers: { 'Idempotency-Key': payKey },
              body: JSON.stringify({
                financialAccountId: effectivePayment.accountId,
                amount: Number(
                  state.payableAmount ?? centsToDecimal(totals.total),
                ),
              }),
            },
            'Não foi possível lançar o pagamento.',
          );
        } catch (cause) {
          setKeys((current) => ({ ...current, pay: undefined }));
          throw new Error(
            `A compra foi registrada e o estoque atualizado, mas o pagamento não foi lançado: ${
              cause instanceof Error ? cause.message : 'erro desconhecido'
            } Tente de novo ou quite em Financeiro → Contas a pagar.`,
          );
        }
      }
      finish(
        'Compra registrada',
        `${plural(totals.units, 'unidade', 'unidades')} no estoque · ${formatCents(totals.total)}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível registrar a compra.',
      );
    } finally {
      setPending(undefined);
    }
  }

  async function saveDraft() {
    setPending('draft');
    setError(undefined);
    try {
      await savePurchase();
      finish(
        'Rascunho salvo',
        'Você pode concluir a compra depois em Compras.',
      );
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

  const choice = (active: boolean) =>
    cn(
      'flex min-h-16 items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-brand-accent',
      active && 'border-brand-accent bg-brand-accent-subtle',
    );

  return (
    <TaskFlow>
      <TaskFlowHeader
        eyebrow={draft ? 'Rascunho de compra' : 'Compras'}
        title="Nova compra"
        closeHref="/compras"
        closeLabel="Fechar e voltar para Compras"
        actions={
          lines.length > 0 &&
          !locked && (
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
      <TaskFlowSteps steps={STEPS} current={step} label="Etapas da compra" />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="grid min-w-0 grid-cols-1 gap-5">
          {step === 0 && (
            <>
              <section
                aria-labelledby="supplier-title"
                className="grid min-w-0 grid-cols-1 gap-2"
              >
                <h2
                  id="supplier-title"
                  className="text-md font-semibold text-neutral-900"
                >
                  De quem você comprou?
                </h2>
                <ContactPicker
                  kind="supplier"
                  contacts={suppliers}
                  value={supplierId}
                  onChange={setSupplierId}
                  onCreated={(supplier) =>
                    setSuppliers((current) => [...current, supplier])
                  }
                  canCreate={canCreateSupplier}
                />
                {!supplierId && (
                  <p className="text-xs text-neutral-500">
                    Opcional — só é obrigatório para pagar depois.
                  </p>
                )}
              </section>

              {lines.length > 0 && (
                <section
                  aria-labelledby="items-title"
                  className="rounded-lg border border-neutral-100 bg-neutral-0"
                >
                  <h2
                    id="items-title"
                    className="border-b border-neutral-100 px-4 py-3 text-md font-semibold text-neutral-900"
                  >
                    Nesta compra · {plural(totals.units, 'unidade', 'unidades')}
                  </h2>
                  <ul className="divide-y divide-neutral-100">
                    {lines.map((line) => (
                      <li key={line.variantId} className="grid gap-3 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <strong className="block text-md font-semibold text-neutral-900">
                              {line.name}
                            </strong>
                            <span className="text-xs text-neutral-500">
                              {line.sku}
                            </span>
                          </div>
                          <strong className="shrink-0 text-md font-semibold text-neutral-900 tabular-nums">
                            {formatCents(line.unitCostCents * line.quantity)}
                          </strong>
                        </div>
                        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
                          <Stepper
                            value={line.quantity}
                            label={`Quantidade de ${line.name}`}
                            decreaseLabel={`Diminuir ${line.name}`}
                            increaseLabel={`Aumentar ${line.name}`}
                            removeLabel={`Remover ${line.name}`}
                            onChange={(quantity) =>
                              setLines((current) =>
                                updateLine(current, line.variantId, {
                                  quantity,
                                }),
                              )
                            }
                          />
                          <CurrencyInput
                            label={`Quanto pagou por unidade de ${line.name}?`}
                            value={
                              line.unitCostCents
                                ? centsToDecimal(line.unitCostCents)
                                : ''
                            }
                            onValueChange={(value) =>
                              setLines((current) =>
                                updateLine(current, line.variantId, {
                                  unitCostCents: toCents(value),
                                }),
                              )
                            }
                          />
                        </div>
                      </li>
                    ))}
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
                  {lines.length > 0
                    ? 'Adicionar mais produtos'
                    : 'O que você comprou?'}
                </h2>
                <div className="relative">
                  <PackageSearch
                    className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-neutral-300"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setCreatingProduct(false);
                    }}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Buscar ou bipar o código"
                    aria-label="Buscar produto por nome ou código"
                    autoComplete="off"
                    className="h-12 w-full rounded-md border border-neutral-200 bg-neutral-0 pr-11 pl-10 text-md text-neutral-900 focus:border-brand-accent focus:outline-none"
                  />
                  <ScanBarcode
                    className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-neutral-300"
                    aria-hidden="true"
                  />
                </div>

                {creatingProduct ? (
                  <QuickProductForm
                    key={query}
                    initialSku={suggestedSku(query)}
                    initialName={suggestedSku(query) ? '' : query.trim()}
                    onCancel={() => setCreatingProduct(false)}
                    onCreated={(product) => {
                      setProducts((current) => [...current, product]);
                      add(product);
                      setCreatingProduct(false);
                      setQuery('');
                      notify.success('Produto cadastrado', product.name);
                    }}
                  />
                ) : (
                  canCreateProduct && (
                    <button
                      type="button"
                      onClick={() => setCreatingProduct(true)}
                      className="flex min-h-11 items-center gap-2 rounded-md border border-dashed border-neutral-200 px-3 text-sm font-semibold text-brand-accent-hover hover:bg-brand-accent-subtle"
                    >
                      <PackagePlus className="size-5" aria-hidden="true" />
                      {query.trim()
                        ? `Cadastrar produto "${query.trim()}"`
                        : 'Cadastrar produto novo'}
                    </button>
                  )
                )}

                <ul
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  aria-label="Produtos"
                >
                  {shownResults.map((product) => {
                    const variantId = product.variants[0].id;
                    const inPurchase =
                      lines.find((line) => line.variantId === variantId)
                        ?.quantity ?? 0;
                    return (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => add(product)}
                          aria-label={`Adicionar ${product.name}${inPurchase ? ` (${inPurchase} na compra)` : ''}`}
                          className={cn(
                            'flex min-h-14 w-full items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-0 px-3 py-2 text-left hover:border-brand-accent focus-visible:outline-2 focus-visible:outline-brand-accent',
                            inPurchase > 0 &&
                              'border-brand-accent bg-brand-accent-subtle',
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <strong className="line-clamp-2 text-sm font-semibold text-neutral-900">
                              {product.name}
                            </strong>
                            <span className="block text-xs text-neutral-500">
                              {product.sku}
                            </span>
                          </span>
                          {inPurchase > 0 ? (
                            <span className="shrink-0 text-xs font-semibold text-brand-accent-hover">
                              {inPurchase} na compra
                            </span>
                          ) : (
                            <Plus
                              className="size-4 shrink-0 text-brand-accent-hover"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {results.length === 0 && !creatingProduct && (
                  <p className="rounded-md bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
                    {query.trim()
                      ? `Nenhum produto com "${query}".`
                      : 'Nenhum produto cadastrado ainda.'}
                    {canCreateProduct &&
                      ' Cadastre ali em cima, sem sair da compra.'}
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
                aria-labelledby="arrival-title"
                className="grid min-w-0 grid-cols-1 gap-3"
              >
                <h2
                  id="arrival-title"
                  className="text-md font-semibold text-neutral-900"
                >
                  A mercadoria já chegou?
                </h2>
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  role="radiogroup"
                  aria-labelledby="arrival-title"
                >
                  {(
                    [
                      [
                        'arrived',
                        PackageCheck,
                        'Já chegou',
                        'Dá entrada no estoque agora',
                      ],
                      [
                        'transit',
                        Truck,
                        'Ainda vai chegar',
                        'Fica como em trânsito',
                      ],
                    ] as [Arrival, LucideIcon, string, string][]
                  ).map(([value, Icon, title, detail]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={arrival === value}
                      disabled={locked}
                      onClick={() => {
                        setArrival(value);
                        setError(undefined);
                      }}
                      className={choice(arrival === value)}
                    >
                      <Icon
                        className="size-6 shrink-0 text-brand-accent-hover"
                        aria-hidden="true"
                      />
                      <span>
                        <strong className="block text-sm font-semibold text-neutral-900">
                          {title}
                        </strong>
                        <span className="block text-xs text-neutral-500">
                          {detail}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {arrival === 'transit' && (
                  <p className="rounded-md bg-info-50 px-3 py-2 text-sm text-neutral-700">
                    Quando a mercadoria chegar, use <strong>Receber</strong> na
                    lista de Compras para lançar o frete, o pagamento e dar
                    entrada no estoque.
                  </p>
                )}
              </section>

              {arrival === 'arrived' && (
                <>
                  <section
                    aria-labelledby="costs-title"
                    className="grid min-w-0 grid-cols-1 gap-3"
                  >
                    <h2
                      id="costs-title"
                      className="text-md font-semibold text-neutral-900"
                    >
                      Teve frete ou outros custos?
                    </h2>
                    <CurrencyInput
                      label="Frete e outros custos (opcional)"
                      value={freightCents ? centsToDecimal(freightCents) : ''}
                      onValueChange={(value) => setFreightCents(toCents(value))}
                      hint="É dividido entre os produtos pelo valor de cada um e entra no custo."
                    />
                    {freightCents > 0 && (
                      <CalculatedBox title="Custo final por unidade (com frete)">
                        {lines.map((line) => (
                          <SummaryRow
                            key={line.variantId}
                            label={line.name}
                            value={formatCents(finalCosts[line.variantId])}
                          />
                        ))}
                      </CalculatedBox>
                    )}
                  </section>

                  <section
                    aria-labelledby="pay-title"
                    className="grid min-w-0 grid-cols-1 gap-3"
                  >
                    <h2
                      id="pay-title"
                      className="text-md font-semibold text-neutral-900"
                    >
                      Como foi o pagamento?
                    </h2>
                    <div
                      className="grid grid-cols-1 gap-2"
                      role="radiogroup"
                      aria-labelledby="pay-title"
                    >
                      {canPay && accounts.length > 0 && (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={payment?.mode === 'paid'}
                          onClick={() =>
                            setPayment({
                              mode: 'paid',
                              accountId:
                                accounts.length === 1 ? accounts[0].id : '',
                            })
                          }
                          className={choice(payment?.mode === 'paid')}
                        >
                          <Landmark
                            className="size-6 shrink-0 text-brand-accent-hover"
                            aria-hidden="true"
                          />
                          <span>
                            <strong className="block text-sm font-semibold text-neutral-900">
                              Já paguei
                            </strong>
                            <span className="block text-xs text-neutral-500">
                              Lança a saída do dinheiro agora
                            </span>
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={payment?.mode === 'later'}
                        onClick={() =>
                          setPayment({
                            mode: 'later',
                            count: 1,
                            firstDueDate: isoInDays(30),
                          })
                        }
                        className={choice(payment?.mode === 'later')}
                      >
                        <WalletCards
                          className="size-6 shrink-0 text-brand-accent-hover"
                          aria-hidden="true"
                        />
                        <span>
                          <strong className="block text-sm font-semibold text-neutral-900">
                            Vou pagar depois
                          </strong>
                          <span className="block text-xs text-neutral-500">
                            À vista ou parcelado, gera contas a pagar
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={payment?.mode === 'none'}
                        onClick={() => setPayment({ mode: 'none' })}
                        className={choice(payment?.mode === 'none')}
                      >
                        <CircleSlash
                          className="size-6 shrink-0 text-neutral-300"
                          aria-hidden="true"
                        />
                        <span>
                          <strong className="block text-sm font-semibold text-neutral-900">
                            Não registrar o pagamento agora
                          </strong>
                          <span className="block text-xs text-neutral-500">
                            O financeiro fica sem essa saída
                          </span>
                        </span>
                      </button>
                    </div>

                    {payment?.mode === 'paid' && (
                      <div className="grid gap-2">
                        <span className="text-sm font-semibold text-neutral-700">
                          De qual conta saiu o dinheiro?
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {accounts.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              aria-pressed={payment.accountId === item.id}
                              onClick={() =>
                                setPayment({ mode: 'paid', accountId: item.id })
                              }
                              className={cn(
                                'min-h-11 rounded-full border border-neutral-200 px-4 text-sm font-semibold text-neutral-700',
                                payment.accountId === item.id &&
                                  'border-brand-accent bg-brand-accent-subtle text-neutral-900',
                              )}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {payment?.mode === 'later' && (
                      <div className="grid gap-4 rounded-lg border border-neutral-100 bg-neutral-0 p-4">
                        {!supplierId && (
                          <p className="rounded-md bg-warning-50 px-3 py-2 text-sm text-neutral-900">
                            Para pagar depois, volte uma etapa e escolha o
                            fornecedor.
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-neutral-700">
                            Em quantas vezes?
                          </span>
                          <Stepper
                            value={payment.count}
                            max={12}
                            label="Número de parcelas"
                            decreaseLabel="Menos parcelas"
                            increaseLabel="Mais parcelas"
                            format={(count) => `${count}x`}
                            onChange={(count) =>
                              setPayment({ ...payment, count })
                            }
                          />
                        </div>
                        <label className="grid gap-1 text-sm font-semibold text-neutral-700">
                          Quando vence o primeiro pagamento?
                          <input
                            type="date"
                            value={payment.firstDueDate}
                            onChange={(event) =>
                              setPayment({
                                ...payment,
                                firstDueDate: event.target.value,
                              })
                            }
                            className="h-11 rounded-md border border-neutral-200 px-3 font-normal text-neutral-900"
                          />
                        </label>
                        {schedule.length > 0 && (
                          <CalculatedBox title="Contas a pagar que serão criadas">
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
                </>
              )}
            </>
          )}

          {step === 2 && arrival && (
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
                  {lines.map((line) => (
                    <li
                      key={line.variantId}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <span className="min-w-0">
                        <strong className="block truncate font-semibold text-neutral-900">
                          {line.name}
                        </strong>
                        <span className="text-neutral-500">
                          {line.quantity} × {formatCents(line.unitCostCents)}
                          {freight > 0 &&
                            ` · custo final ${formatCents(finalCosts[line.variantId])}`}
                        </span>
                      </span>
                      <strong className="shrink-0 tabular-nums">
                        {formatCents(line.unitCostCents * line.quantity)}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-2 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-700">
                <strong className="text-neutral-900">
                  O que esta compra vai fazer:
                </strong>
                <ul className="grid list-disc gap-1 pl-5">
                  <li>
                    Fornecedor: {selectedSupplier?.name ?? 'não informado'}.
                  </li>
                  {arrival === 'transit' ? (
                    <li>
                      Registrar o pedido de{' '}
                      {plural(totals.units, 'unidade', 'unidades')} como{' '}
                      <strong>em trânsito</strong> — ainda não entra no estoque
                      disponível.
                    </li>
                  ) : (
                    <>
                      <li>
                        Dar entrada de{' '}
                        {plural(totals.units, 'unidade', 'unidades')} no estoque
                        e recalcular o custo médio
                        {freight > 0
                          ? ` (com o frete de ${formatCents(freight)} dividido entre os itens)`
                          : ''}
                        .
                      </li>
                      {payment?.mode === 'paid' && (
                        <li>
                          Lançar a saída de {formatCents(totals.total)} em{' '}
                          {account?.name}.
                        </li>
                      )}
                      {payment?.mode === 'later' && (
                        <li>
                          Criar {plural(schedule.length, 'conta', 'contas')} a
                          pagar para {selectedSupplier?.name}:{' '}
                          {schedule
                            .map(
                              (item) =>
                                `${formatCents(item.cents)} em ${dateLabel(item.dueDate)}`,
                            )
                            .join('; ')}
                          .
                        </li>
                      )}
                      {payment?.mode === 'none' && (
                        <li>
                          Não registrar o pagamento (o financeiro fica sem essa
                          saída).
                        </li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            </section>
          )}
        </div>

        <aside
          className="hidden lg:sticky lg:top-24 lg:block"
          aria-label="Resumo da compra"
        >
          <div className="grid gap-3 rounded-lg border border-neutral-100 bg-neutral-0 p-4 text-sm shadow-sm">
            <strong className="text-md text-neutral-900">Resumo</strong>
            <SummaryRow label="Unidades" value={String(totals.units)} />
            <SummaryRow
              label="Mercadorias"
              value={formatCents(totals.merchandise)}
            />
            {freight > 0 && (
              <SummaryRow label="Frete e custos" value={formatCents(freight)} />
            )}
            <SummaryRow
              label="Fornecedor"
              value={selectedSupplier?.name ?? '—'}
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

      <TaskFlowFooter
        error={error}
        onBack={
          step > 0 && !locked
            ? () => setStep((current) => current - 1)
            : undefined
        }
        backDisabled={Boolean(pending)}
        summaryLabel={`Total · ${plural(totals.units, 'unidade', 'unidades')}`}
        summaryValue={formatCents(totals.total)}
      >
        {step < 2 ? (
          <Button
            type="button"
            size="lg"
            onClick={goNext}
            disabled={lines.length === 0}
          >
            Continuar
          </Button>
        ) : (
          <Button
            aria-label={locked ? undefined : 'Confirmar compra'}
            type="button"
            size="lg"
            onClick={confirm}
            loading={pending === 'confirm'}
            disabled={Boolean(pending)}
          >
            {locked ? (
              'Tentar de novo'
            ) : (
              <>
                Confirmar<span className="hidden sm:inline"> compra</span>
              </>
            )}
          </Button>
        )}
      </TaskFlowFooter>
    </TaskFlow>
  );
}

import { centsToDecimal, toCents } from '@/lib/money';

// Regras de prévia da Nova venda: carrinho, totais, taxa da forma de
// pagamento e agenda de parcelas do fiado. Tudo em centavos inteiros. A
// agenda espelha apps/api/src/common/finance/installment-schedule.ts para
// que o usuário veja exatamente as parcelas que a API vai gerar
// (DS-WIZARD-002: "o usuário vê antes de confirmar, não depois").

export type CatalogProduct = {
  id: string;
  name: string;
  sku: string;
  status: string;
  variants: { id: string }[];
  prices: { salePrice: string }[];
};

export type CartLine = {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
};

export type PaymentMethod = {
  id: string;
  name: string;
  type: string;
  status: string;
  feeRate?: string | number | null;
  feeFixed?: string | number | null;
  financialAccountId?: string | null;
};

export function addToCart(
  cart: CartLine[],
  product: CatalogProduct,
): CartLine[] {
  const variantId = product.variants[0]?.id;
  if (!variantId) return cart;
  const existing = cart.find((line) => line.variantId === variantId);
  if (existing)
    return cart.map((line) =>
      line.variantId === variantId
        ? { ...line, quantity: line.quantity + 1 }
        : line,
    );
  return [
    ...cart,
    {
      productId: product.id,
      variantId,
      name: product.name,
      sku: product.sku,
      unitPriceCents: toCents(product.prices[0]?.salePrice),
      quantity: 1,
    },
  ];
}

export function setQuantity(
  cart: CartLine[],
  variantId: string,
  quantity: number,
) {
  if (quantity <= 0) return cart.filter((line) => line.variantId !== variantId);
  return cart.map((line) =>
    line.variantId === variantId ? { ...line, quantity } : line,
  );
}

export function setUnitPrice(
  cart: CartLine[],
  variantId: string,
  cents: number,
) {
  return cart.map((line) =>
    line.variantId === variantId
      ? { ...line, unitPriceCents: Math.max(0, cents) }
      : line,
  );
}

export function cartTotals(cart: CartLine[], discountCents = 0) {
  const subtotal = cart.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const units = cart.reduce((sum, line) => sum + line.quantity, 0);
  const discount = Math.min(Math.max(discountCents, 0), subtotal);
  return { subtotal, discount, total: subtotal - discount, units };
}

/** Mesmo cálculo da API: valor × taxa% / 100 + taxa fixa. */
export function paymentFee(amountCents: number, method?: PaymentMethod) {
  if (!method || amountCents <= 0) return { fee: 0, net: amountCents };
  const rate = Number(method.feeRate ?? 0);
  const fixed = toCents(method.feeFixed ?? 0);
  const fee = Math.round((amountCents * rate) / 100) + fixed;
  return { fee, net: amountCents - fee };
}

/** Espelho de buildInstallmentSchedule (API): diferença de centavos na última parcela. */
export function installmentSchedule(
  totalCents: number,
  count: number,
  firstDueDate: string,
) {
  if (totalCents <= 0 || count < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate))
    return [];
  const base = Math.floor(totalCents / count);
  const first = new Date(`${firstDueDate}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const targetMonth = first.getUTCMonth() + index;
    const year = first.getUTCFullYear() + Math.floor(targetMonth / 12);
    const month = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const due = new Date(
      Date.UTC(year, month, Math.min(first.getUTCDate(), lastDay)),
    );
    return {
      number: index + 1,
      cents: index === count - 1 ? totalCents - base * (count - 1) : base,
      dueDate: due.toISOString().slice(0, 10),
    };
  });
}

/** Busca sem acento/caixa por nome ou SKU; SKU exato vem primeiro. */
export function searchProducts(products: CatalogProduct[], query: string) {
  const normalize = (text: string) =>
    text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const q = normalize(query);
  const active = products.filter(
    (product) => product.status === 'active' && product.variants[0],
  );
  if (!q) return active;
  const terms = q.split(/\s+/);
  return active
    .filter((product) => {
      const haystack = `${normalize(product.name)} ${normalize(product.sku)}`;
      return terms.every((term) => haystack.includes(term));
    })
    .sort(
      (a, b) => Number(normalize(b.sku) === q) - Number(normalize(a.sku) === q),
    );
}

export type Payment =
  | { mode: 'now'; methodId: string }
  | {
      mode: 'credit';
      count: number;
      firstDueDate: string;
      upfrontCents: number;
      upfrontMethodId: string;
    };

/** Corpo do POST /sales/:id/confirm a partir da escolha de pagamento. */
export function confirmPayload(totalCents: number, payment: Payment) {
  if (payment.mode === 'now')
    return {
      payments: [
        {
          paymentMethodId: payment.methodId,
          amount: Number(centsToDecimal(totalCents)),
        },
      ],
    };
  const upfront = Math.min(Math.max(payment.upfrontCents, 0), totalCents);
  return {
    payments:
      upfront > 0 && payment.upfrontMethodId
        ? [
            {
              paymentMethodId: payment.upfrontMethodId,
              amount: Number(centsToDecimal(upfront)),
            },
          ]
        : [],
    ...(upfront < totalCents
      ? {
          installmentPlan: {
            count: payment.count,
            firstDueDate: payment.firstDueDate,
          },
        }
      : {}),
  };
}

/** Mensagem acionável do que falta para avançar/confirmar, ou null. */
export function paymentProblem(
  payment: Payment | null,
  totalCents: number,
  customerId: string,
): string | null {
  if (!payment) return 'Escolha como o cliente vai pagar.';
  if (payment.mode === 'now')
    return payment.methodId ? null : 'Escolha a forma de pagamento.';
  if (!customerId)
    return 'Selecione ou cadastre o cliente para vender no fiado.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.firstDueDate))
    return 'Informe quando vence a primeira parcela.';
  if (payment.upfrontCents > totalCents)
    return 'A entrada não pode ser maior que o total.';
  if (payment.upfrontCents > 0 && !payment.upfrontMethodId)
    return 'Escolha como o cliente pagou a entrada.';
  if (payment.upfrontCents === totalCents)
    return 'A entrada cobre o total: use "Pagar agora".';
  return null;
}

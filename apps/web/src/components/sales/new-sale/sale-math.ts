import type { CatalogProduct } from '@/lib/catalog';
import { centsToDecimal, toCents } from '@/lib/money';

export { searchProducts, type CatalogProduct } from '@/lib/catalog';
export { installmentSchedule } from '@/lib/installments';

// Regras de prévia da Nova venda: carrinho, totais, taxa da forma de
// pagamento e agenda de parcelas do fiado. Tudo em centavos inteiros. A
// agenda espelha apps/api/src/common/finance/installment-schedule.ts para
// que o usuário veja exatamente as parcelas que a API vai gerar
// (DS-WIZARD-002: "o usuário vê antes de confirmar, não depois").

export type CartLine = {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  /** Brinde (BR §10.10, regra 19): sai de graça; o preço fica guardado para desmarcar. */
  isGift?: boolean;
};

/** Preço que vale na venda: zero quando a linha é brinde. */
export const linePrice = (line: CartLine) =>
  line.isGift ? 0 : line.unitPriceCents;

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

export function setGift(cart: CartLine[], variantId: string, isGift: boolean) {
  return cart.map((line) =>
    line.variantId === variantId ? { ...line, isGift } : line,
  );
}

export function cartTotals(cart: CartLine[], discountCents = 0) {
  const subtotal = cart.reduce(
    (sum, line) => sum + linePrice(line) * line.quantity,
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

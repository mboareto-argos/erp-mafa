import type { CatalogProduct } from '@/lib/catalog';
import { centsToDecimal } from '@/lib/money';

// Regras de prévia da Nova compra, em centavos inteiros. O rateio do frete
// espelha apps/api/src/modules/purchasing/purchases/cost-allocation.ts
// (proporcional ao valor de cada item — BR §10.6: 10 un × R$ 100 + frete
// R$ 100 → custo final R$ 110). O valor oficial é sempre o da API.

export type PurchaseLine = {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  quantity: number;
  unitCostCents: number;
};

export type Arrival = 'arrived' | 'transit';

export type PurchasePayment =
  | { mode: 'paid'; accountId: string }
  | { mode: 'later'; count: number; firstDueDate: string }
  | { mode: 'none' };

export function addToPurchase(
  lines: PurchaseLine[],
  product: CatalogProduct,
): PurchaseLine[] {
  const variantId = product.variants[0]?.id;
  if (!variantId) return lines;
  if (lines.some((line) => line.variantId === variantId))
    return lines.map((line) =>
      line.variantId === variantId
        ? { ...line, quantity: line.quantity + 1 }
        : line,
    );
  return [
    ...lines,
    {
      productId: product.id,
      variantId,
      name: product.name,
      sku: product.sku,
      quantity: 1,
      unitCostCents: 0,
    },
  ];
}

export function updateLine(
  lines: PurchaseLine[],
  variantId: string,
  patch: Partial<PurchaseLine>,
) {
  const next = lines.map((line) =>
    line.variantId === variantId ? { ...line, ...patch } : line,
  );
  return next.filter((line) => line.quantity > 0);
}

export function purchaseTotals(lines: PurchaseLine[], freightCents = 0) {
  const merchandise = lines.reduce(
    (sum, line) => sum + line.unitCostCents * line.quantity,
    0,
  );
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const freight = Math.max(0, freightCents);
  return { merchandise, freight, total: merchandise + freight, units };
}

/** Custo final por unidade (custo + parte do frete), arredondado ao centavo para exibição. */
export function finalUnitCosts(lines: PurchaseLine[], freightCents: number) {
  const { merchandise } = purchaseTotals(lines);
  return Object.fromEntries(
    lines.map((line) => {
      const lineValue = line.unitCostCents * line.quantity;
      const share =
        merchandise === 0 ? 0 : (freightCents * lineValue) / merchandise;
      return [
        line.variantId,
        Math.round(line.unitCostCents + share / line.quantity),
      ];
    }),
  ) as Record<string, number>;
}

export function linesProblem(lines: PurchaseLine[]): string | null {
  if (lines.length === 0) return 'Adicione pelo menos um produto.';
  const missing = lines.find((line) => line.unitCostCents <= 0);
  if (missing)
    return `Informe quanto você pagou por unidade de ${missing.name}.`;
  return null;
}

export function paymentProblem(
  arrival: Arrival | null,
  payment: PurchasePayment | null,
  supplierId: string,
): string | null {
  if (!arrival) return 'Diga se a mercadoria já chegou.';
  if (arrival === 'transit') return null;
  if (!payment) return 'Diga como foi o pagamento.';
  if (payment.mode === 'paid' && !payment.accountId)
    return 'Escolha de qual conta saiu o dinheiro.';
  if (payment.mode === 'later') {
    if (!supplierId)
      return 'Para pagar depois, selecione ou cadastre o fornecedor.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.firstDueDate))
      return 'Informe quando vence o primeiro pagamento.';
  }
  return null;
}

/**
 * Corpo do POST /purchasing/purchases/:id/receive. "Já paguei" usa a mesma
 * mecânica da API para compra a prazo (1 conta a pagar vencendo hoje), que
 * depois é quitada na conta escolhida — assim a saída de dinheiro aparece no
 * caixa, sem regra financeira nova.
 */
export function receivePayload(
  purchaseItems: { id: string; productVariantId: string; quantity: string }[],
  freightCents: number,
  payment: PurchasePayment,
  today: string,
) {
  return {
    items: purchaseItems.map((item) => ({
      purchaseItemId: item.id,
      quantityReceived: Number(item.quantity),
    })),
    additionalCosts:
      freightCents > 0
        ? [{ type: 'frete', amount: Number(centsToDecimal(freightCents)) }]
        : [],
    ...(payment.mode === 'paid'
      ? { installmentPlan: { count: 1, firstDueDate: today } }
      : payment.mode === 'later'
        ? {
            installmentPlan: {
              count: payment.count,
              firstDueDate: payment.firstDueDate,
            },
          }
        : {}),
  };
}

/**
 * Campos sugeridos para cadastrar um produto a partir do que foi buscado ou
 * bipado: só dígitos (8–14) é código de barras; código com letras e números
 * vira código interno; texto livre vira o nome.
 */
export function suggestedFields(query: string) {
  const trimmed = query.trim();
  if (/^\d{8,14}$/.test(trimmed))
    return { barcode: trimmed, sku: '', name: '' };
  if (/^[\w.-]{3,60}$/.test(trimmed) && /\d/.test(trimmed))
    return { barcode: '', sku: trimmed.toUpperCase(), name: '' };
  return { barcode: '', sku: '', name: trimmed };
}

/** Parece um código de barras (só dígitos, 8 a 14)? */
export const looksLikeBarcode = (query: string) =>
  /^\d{8,14}$/.test(query.trim());

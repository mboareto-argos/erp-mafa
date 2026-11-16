import { describe, expect, it } from 'vitest';
import type { CatalogProduct } from '@/lib/catalog';
import {
  addToPurchase,
  finalUnitCosts,
  linesProblem,
  paymentProblem,
  purchaseTotals,
  receivePayload,
  suggestedSku,
  updateLine,
  type PurchaseLine,
} from './purchase-math';

const product = (id: string, name: string): CatalogProduct => ({
  id,
  name,
  sku: `SKU-${id}`,
  status: 'active',
  variants: [{ id: `v${id}` }],
  prices: [{ salePrice: '100' }],
});
const line = (
  variantId: string,
  quantity: number,
  unitCostCents: number,
): PurchaseLine => ({
  productId: variantId,
  variantId,
  name: variantId,
  sku: variantId,
  quantity,
  unitCostCents,
});

describe('itens da compra', () => {
  it('produto repetido soma quantidade; custo começa vazio para ser informado', () => {
    const lines = addToPurchase(
      addToPurchase([], product('1', 'Yara')),
      product('1', 'Yara'),
    );
    expect(lines).toEqual([
      expect.objectContaining({
        variantId: 'v1',
        quantity: 2,
        unitCostCents: 0,
      }),
    ]);
    expect(linesProblem(lines)).toBe(
      'Informe quanto você pagou por unidade de Yara.',
    );
    expect(linesProblem([])).toMatch(/Adicione/);
  });

  it('quantidade zero tira o item da compra', () => {
    expect(updateLine([line('a', 1, 100)], 'a', { quantity: 0 })).toEqual([]);
  });
});

describe('rateio do frete (espelho de cost-allocation.ts da API)', () => {
  it('exemplo do Documento de Negócio §10.6: 10 × R$ 100 + frete R$ 100 → R$ 110', () => {
    expect(finalUnitCosts([line('a', 10, 10000)], 10000)).toEqual({ a: 11000 });
  });

  it('proporcional ao valor de cada item', () => {
    const lines = [line('hayaati', 6, 11000), line('yara', 1, 12000)];
    expect(purchaseTotals(lines, 7800)).toEqual({
      merchandise: 78000,
      freight: 7800,
      total: 85800,
      units: 7,
    });
    expect(finalUnitCosts(lines, 7800)).toEqual({
      hayaati: 12100,
      yara: 13200,
    });
  });
});

describe('pagamento e corpo do recebimento', () => {
  const items = [{ id: 'item-1', productVariantId: 'v1', quantity: '6' }];

  it('"Já paguei" vira 1 conta a pagar vencendo hoje (depois quitada)', () => {
    expect(
      receivePayload(
        items,
        7800,
        { mode: 'paid', accountId: 'acc' },
        '2026-11-16',
      ),
    ).toEqual({
      items: [{ purchaseItemId: 'item-1', quantityReceived: 6 }],
      additionalCosts: [{ type: 'frete', amount: 78 }],
      installmentPlan: { count: 1, firstDueDate: '2026-11-16' },
    });
  });

  it('"Pagar depois" usa as parcelas escolhidas; "não registrar" não gera contas', () => {
    expect(
      receivePayload(
        items,
        0,
        { mode: 'later', count: 3, firstDueDate: '2026-12-16' },
        '2026-11-16',
      ),
    ).toEqual({
      items: [{ purchaseItemId: 'item-1', quantityReceived: 6 }],
      additionalCosts: [],
      installmentPlan: { count: 3, firstDueDate: '2026-12-16' },
    });
    expect(
      receivePayload(items, 0, { mode: 'none' }, '2026-11-16'),
    ).not.toHaveProperty('installmentPlan');
  });

  it('mensagens acionáveis do que falta', () => {
    expect(paymentProblem(null, null, '')).toMatch(/chegou/);
    expect(paymentProblem('transit', null, '')).toBeNull();
    expect(paymentProblem('arrived', null, '')).toMatch(/pagamento/);
    expect(
      paymentProblem('arrived', { mode: 'paid', accountId: '' }, ''),
    ).toMatch(/conta/);
    expect(
      paymentProblem(
        'arrived',
        { mode: 'later', count: 1, firstDueDate: '2026-12-01' },
        '',
      ),
    ).toMatch(/fornecedor/);
    expect(
      paymentProblem(
        'arrived',
        { mode: 'later', count: 1, firstDueDate: '2026-12-01' },
        's1',
      ),
    ).toBeNull();
  });
});

describe('código sugerido para produto novo', () => {
  it('usa o que foi buscado/bipado quando parece código', () => {
    expect(suggestedSku('6291108730515')).toBe('6291108730515');
    expect(suggestedSku('lat-yara-100')).toBe('LAT-YARA-100');
    expect(suggestedSku('Yara rosa')).toBe('');
  });
});

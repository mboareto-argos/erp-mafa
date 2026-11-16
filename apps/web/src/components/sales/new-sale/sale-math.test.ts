import { describe, expect, it } from 'vitest';
import {
  addToCart,
  cartTotals,
  confirmPayload,
  installmentSchedule,
  paymentFee,
  paymentProblem,
  searchProducts,
  setQuantity,
  type CatalogProduct,
} from './sale-math';

const product = (
  id: string,
  name: string,
  sku: string,
  price: string,
  status = 'active',
): CatalogProduct => ({
  id,
  name,
  sku,
  status,
  variants: [{ id: `v-${id}` }],
  prices: [{ salePrice: price }],
});
const yara = product('1', 'Yara EDP 100 ml', 'LAT-YARA-100', '249.9');
const khamrah = product('2', 'Khamrah EDP 100 ml', 'LAT-KHAMRAH-100', '289.9');

describe('carrinho', () => {
  it('adicionar o mesmo produto soma quantidade, não duplica a linha', () => {
    const cart = addToCart(addToCart([], yara), yara);
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({ quantity: 2, unitPriceCents: 24990 });
  });

  it('quantidade zero remove o item', () => {
    const cart = setQuantity(addToCart([], yara), 'v-1', 0);
    expect(cart).toEqual([]);
  });

  it('totais em centavos; desconto nunca passa do subtotal', () => {
    const cart = addToCart(addToCart([], yara), khamrah);
    expect(cartTotals(cart)).toEqual({
      subtotal: 53980,
      discount: 0,
      total: 53980,
      units: 2,
    });
    expect(cartTotals(cart, 1000).total).toBe(52980);
    expect(cartTotals(cart, 999999).total).toBe(0);
  });
});

describe('busca de produto', () => {
  it('ignora acento/caixa, exige todos os termos e esconde inativos', () => {
    const inactive = product('3', 'Asad EDP', 'LAT-ASAD', '10', 'inactive');
    expect(
      searchProducts([yara, khamrah, inactive], 'YARA').map((p) => p.id),
    ).toEqual(['1']);
    expect(searchProducts([yara, khamrah], 'edp 100').map((p) => p.id)).toEqual(
      ['1', '2'],
    );
    expect(searchProducts([yara, inactive], '').map((p) => p.id)).toEqual([
      '1',
    ]);
  });

  it('código (SKU) exato vem primeiro — leitor de código de barras + Enter', () => {
    const similar = product('4', 'Kit LAT-YARA-100 presente', 'KIT-1', '10');
    expect(searchProducts([similar, yara], 'lat-yara-100')[0].id).toBe('1');
  });
});

describe('taxa da forma de pagamento (mesma fórmula da API)', () => {
  it('valor × taxa% / 100 + taxa fixa', () => {
    const credit = {
      id: 'c',
      name: 'Crédito',
      type: 'credit_card',
      status: 'active',
      feeRate: '3.49',
    };
    expect(paymentFee(53980, credit)).toEqual({ fee: 1884, net: 52096 });
    expect(
      paymentFee(10000, { ...credit, feeRate: 0, feeFixed: '0.5' }),
    ).toEqual({ fee: 50, net: 9950 });
    expect(paymentFee(10000)).toEqual({ fee: 0, net: 10000 });
  });
});

describe('agenda do fiado (espelho de buildInstallmentSchedule da API)', () => {
  it('diferença de centavos fica na última parcela', () => {
    expect(installmentSchedule(53980, 3, '2026-12-16')).toEqual([
      { number: 1, cents: 17993, dueDate: '2026-12-16' },
      { number: 2, cents: 17993, dueDate: '2027-01-16' },
      { number: 3, cents: 17994, dueDate: '2027-02-16' },
    ]);
  });

  it('dia 31 vira o último dia dos meses curtos', () => {
    expect(
      installmentSchedule(30000, 3, '2027-01-31').map((i) => i.dueDate),
    ).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
  });
});

describe('pagamento → corpo do confirm', () => {
  it('à vista paga o total na forma escolhida', () => {
    expect(confirmPayload(53980, { mode: 'now', methodId: 'pix' })).toEqual({
      payments: [{ paymentMethodId: 'pix', amount: 539.8 }],
    });
  });

  it('fiado com entrada: paga a entrada e parcela o resto', () => {
    expect(
      confirmPayload(53980, {
        mode: 'credit',
        count: 2,
        firstDueDate: '2026-12-16',
        upfrontCents: 10000,
        upfrontMethodId: 'pix',
      }),
    ).toEqual({
      payments: [{ paymentMethodId: 'pix', amount: 100 }],
      installmentPlan: { count: 2, firstDueDate: '2026-12-16' },
    });
  });

  it('mensagens acionáveis do que falta', () => {
    expect(paymentProblem(null, 100, '')).toMatch(/Escolha/);
    const credit = {
      mode: 'credit' as const,
      count: 1,
      firstDueDate: '2026-12-16',
      upfrontCents: 0,
      upfrontMethodId: '',
    };
    expect(paymentProblem(credit, 100, '')).toMatch(/cliente/);
    expect(paymentProblem({ ...credit, upfrontCents: 50 }, 100, 'c1')).toMatch(
      /entrada/,
    );
    expect(paymentProblem(credit, 100, 'c1')).toBeNull();
  });
});

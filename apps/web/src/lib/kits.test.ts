import { describe, expect, it } from 'vitest';
import { withKitAvailability, type CatalogProduct } from './catalog';
import { kitPreview } from './kits';

// Exemplo da BR §10.3 (regras 11 e 12) usado também na API:
// peça A R$ 150 avulsa (1 por kit), peça B R$ 40 avulsa (2 por kit).
describe('kits', () => {
  it('prévia: peças avulsas, economia e quantos dá para montar', () => {
    const preview = kitPreview(
      [
        {
          productVariantId: 'a',
          name: 'A',
          quantity: 1,
          salePriceCents: 15000,
          available: 10,
        },
        {
          productVariantId: 'b',
          name: 'B',
          quantity: 2,
          salePriceCents: 4000,
          available: 7,
        },
      ],
      20000,
    );
    expect(preview).toEqual({ separate: 23000, savings: 3000, canAssemble: 3 });
  });

  it('economia nunca fica negativa e kit sem peças não monta nada', () => {
    expect(kitPreview([], 5000)).toEqual({
      separate: 0,
      savings: 0,
      canAssemble: 0,
    });
  });

  it('estoque do kit "na hora" é quantos dá para montar; kit pronto mantém o próprio', () => {
    const product = (
      id: string,
      kit?: Partial<CatalogProduct>,
    ): CatalogProduct => ({
      id,
      name: id,
      sku: id,
      status: 'active',
      variants: [{ id: `v-${id}` }],
      prices: [],
      ...kit,
    });
    const stock = withKitAvailability(
      [
        product('a'),
        product('b'),
        product('hora', {
          kitMode: 'on_demand',
          kitComponents: [
            { componentVariantId: 'v-a', quantity: '1' },
            { componentVariantId: 'v-b', quantity: '2' },
          ],
        }),
        product('pronto', {
          kitMode: 'assembled',
          kitComponents: [{ componentVariantId: 'v-a', quantity: '1' }],
        }),
      ],
      { 'v-a': 10, 'v-b': 5, 'v-pronto': 4 },
    );
    expect(stock['v-hora']).toBe(2);
    expect(stock['v-pronto']).toBe(4);
    expect(stock['v-a']).toBe(10);
  });
});

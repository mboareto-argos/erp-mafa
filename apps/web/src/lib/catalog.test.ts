import { describe, expect, it } from 'vitest';
import { findByCode, searchProducts, type CatalogProduct } from './catalog';

const product = (
  id: string,
  name: string,
  sku: string,
  barcode: string | null = null,
  status = 'active',
): CatalogProduct => ({
  id,
  name,
  sku,
  status,
  variants: [{ id: `v${id}`, barcode }],
  prices: [{ salePrice: '100' }],
});
const yara = product('1', 'Yara EDP 100 ml', 'LAT-YARA-100', '6291108730515');
const bbw = product(
  '2',
  'Body splash Japanese Cherry',
  'BBW-JPS-236',
  '667555123451',
);
const sem = product('3', 'Decant teste', 'DEC-1');
const off = product('4', 'Inativo', 'OFF-1', '7890000000001', 'inactive');

describe('findByCode (código bipado)', () => {
  it('acha pelo código de barras, depois pelo SKU (sem caixa)', () => {
    expect(findByCode([yara, bbw, sem], '6291108730515')?.id).toBe('1');
    expect(findByCode([yara, bbw, sem], 'dec-1')?.id).toBe('3');
    expect(findByCode([yara, bbw, sem], '000')).toBeUndefined();
    expect(findByCode([yara], '  ')).toBeUndefined();
  });

  it('UPC-A (12 dígitos) e o mesmo número como EAN-13 com zero são o mesmo produto', () => {
    expect(findByCode([bbw], '0667555123451')?.id).toBe('2');
    const savedAsEan = product('5', 'X', 'X-1', '0667555123451');
    expect(findByCode([savedAsEan], '667555123451')?.id).toBe('5');
  });

  it('ignora produto inativo', () => {
    expect(findByCode([off], '7890000000001')).toBeUndefined();
  });
});

describe('searchProducts', () => {
  it('busca também pelo código de barras e põe o código exato primeiro', () => {
    expect(searchProducts([bbw, yara], '62911087').map((p) => p.id)).toEqual([
      '1',
    ]);
    expect(searchProducts([bbw, yara], '6291108730515')[0].id).toBe('1');
    expect(searchProducts([bbw, yara, sem], 'edp').map((p) => p.id)).toEqual([
      '1',
    ]);
  });
});

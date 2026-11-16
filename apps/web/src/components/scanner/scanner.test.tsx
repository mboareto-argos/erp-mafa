import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogProduct } from '@/lib/catalog';
import { BarcodeScanner } from './barcode-scanner';
import { UnknownCodeSheet } from './unknown-code-sheet';

afterEach(() => vi.unstubAllGlobals());

const yara: CatalogProduct = {
  id: 'p1',
  name: 'Yara EDP 100 ml',
  sku: 'LAT-YARA-100',
  status: 'active',
  variants: [{ id: 'v1', barcode: null }],
  prices: [{ salePrice: '249.9' }],
};

describe('BarcodeScanner', () => {
  it('sem câmera disponível (http, sem permissão): explica e deixa digitar o código', async () => {
    const onDetected = vi.fn();
    render(
      <BarcodeScanner open onOpenChange={vi.fn()} onDetected={onDetected} />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /conexão segura|câmera/,
    );
    await userEvent.type(
      screen.getByLabelText('Digitar código'),
      '7891234567895{Enter}',
    );
    expect(onDetected).toHaveBeenCalledWith('7891234567895');
  });

  it('modo contínuo mostra o último item lido', () => {
    render(
      <BarcodeScanner
        open
        continuous
        lastRead="+1 Yara (2 na compra)"
        onOpenChange={vi.fn()}
        onDetected={vi.fn()}
      />,
    );
    expect(screen.getByText('+1 Yara (2 na compra)')).toBeInTheDocument();
  });
});

describe('UnknownCodeSheet', () => {
  it('vincula o código a um produto existente (PATCH barcode)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: 'p1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const onResolved = vi.fn();
    render(
      <UnknownCodeSheet
        code="7891234567895"
        products={[yara]}
        canManageCatalog
        onOpenChange={vi.fn()}
        onResolved={onResolved}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /É um produto que já tenho/ }),
    );
    await userEvent.type(screen.getByLabelText('Qual produto é este?'), 'yara');
    await userEvent.click(
      screen.getByRole('button', { name: /Yara EDP 100 ml/ }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/catalog/products/p1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ barcode: '7891234567895' }),
      }),
    );
    expect(onResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'p1',
        variants: [{ id: 'v1', barcode: '7891234567895' }],
      }),
      'linked',
    );
  });

  it('cadastrar produto novo já vem com o código de barras preenchido', async () => {
    render(
      <UnknownCodeSheet
        code="6291108730515"
        products={[]}
        canManageCatalog
        onOpenChange={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Cadastrar produto novo/ }),
    );
    expect(screen.getByLabelText(/Código de barras/)).toHaveValue(
      '6291108730515',
    );
  });

  it('sem permissão de catálogo, não oferece vincular nem cadastrar (DS-PERM-001)', () => {
    render(
      <UnknownCodeSheet
        code="123"
        products={[yara]}
        canManageCatalog={false}
        onOpenChange={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /É um produto que já tenho/ }),
    ).toBeNull();
    expect(
      screen.getByText(/Peça para quem cuida do catálogo/),
    ).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewSaleFlow } from './new-sale-flow';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

const products = [
  {
    id: 'p1',
    name: 'Yara EDP 100 ml',
    sku: 'LAT-YARA-100',
    status: 'active',
    variants: [{ id: 'v1', barcode: '7891234567895' }],
    prices: [{ salePrice: '249.9' }],
  },
  {
    id: 'p2',
    name: 'Khamrah EDP 100 ml',
    sku: 'LAT-KHAMRAH-100',
    status: 'active',
    variants: [{ id: 'v2' }],
    prices: [{ salePrice: '289.9' }],
  },
];
const methods = [
  {
    id: 'pix',
    name: 'Pix',
    type: 'pix',
    status: 'active',
    feeRate: '0',
    financialAccountId: 'acc',
  },
  {
    id: 'credit',
    name: 'Crédito',
    type: 'credit_card',
    status: 'active',
    feeRate: '3.49',
  },
];

function renderFlow() {
  return render(
    <NewSaleFlow
      products={products}
      methods={methods}
      customers={[{ id: 'c1', name: 'Ana Paula' }]}
      stock={{ v1: 5, v2: 0 }}
      accounts={{ acc: 'Conta PJ' }}
      canCreateCustomer
      draft={null}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
  router.push.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('NewSaleFlow', () => {
  it('câmera: código bipado abre a ficha do produto e "Adicionar ao carrinho" soma a quantidade', async () => {
    renderFlow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Bipar com a câmera' }),
    );
    await userEvent.type(
      await screen.findByLabelText('Digitar código'),
      '7891234567895{Enter}',
    );
    expect(
      await screen.findByRole('button', {
        name: /Adicionar ao carrinho · R\$/,
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Mais uma unidade' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar ao carrinho/ }),
    );
    // A gaveta ainda está animando o fechamento (conteúdo atrás fica
    // aria-hidden), então confere pelo texto.
    expect(screen.getByText(/No carrinho · 2 itens/)).toBeInTheDocument();
  });

  it('"Adicionar a uma venda" na página do produto já abre com ele no carrinho', () => {
    render(
      <NewSaleFlow
        products={products}
        methods={methods}
        customers={[]}
        stock={null}
        accounts={{}}
        canCreateCustomer
        initialAdd="v2"
        draft={null}
      />,
    );
    expect(
      screen.getByRole('heading', { name: /No carrinho · 1 item/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Khamrah EDP 100 ml').length).toBeGreaterThan(0);
  });

  it('Enter na busca adiciona o produto (leitor de código de barras) e atualiza o total', async () => {
    renderFlow();
    await userEvent.type(
      screen.getByRole('searchbox', { name: /Buscar produto/ }),
      'LAT-YARA-100{Enter}',
    );
    expect(
      screen.getByRole('heading', { name: /No carrinho · 1 item/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('R$ 249,90', { selector: 'footer strong' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sem estoque')).toBeInTheDocument();
  });

  it('não avança sem itens: o botão Continuar fica desabilitado', async () => {
    renderFlow();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('fluxo à vista: cria a venda e confirma com o total na forma escolhida', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'sale-1', total: '249.9' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'sale-1', status: 'confirmed' }),
      });
    vi.stubGlobal('fetch', fetchMock);
    renderFlow();
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar Yara/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Pix' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText(/que entra em Conta PJ/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar venda' }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/sales',
      expect.objectContaining({ method: 'POST' }),
    );
    const created = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(created.items).toEqual([
      { productVariantId: 'v1', quantity: 1, unitPrice: 249.9, discount: 0 },
    ]);
    const [confirmUrl, confirmInit] = fetchMock.mock.calls[1];
    expect(confirmUrl).toBe('/api/sales/sale-1/confirm');
    expect(confirmInit.headers['Idempotency-Key']).toBeTruthy();
    expect(JSON.parse(confirmInit.body)).toEqual({
      payments: [{ paymentMethodId: 'pix', amount: 249.9 }],
    });
    expect(router.push).toHaveBeenCalledWith('/vendas');
  });

  it('fiado exige cliente antes de avançar', async () => {
    renderFlow();
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar Yara/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('radio', { name: /Fiado/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Selecione ou cadastre o cliente',
    );
  });

  it('se a confirmação falhar, a nova tentativa reaproveita a mesma venda (não duplica)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'sale-1', total: '249.9' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Estoque insuficiente.' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'sale-1', total: '249.9' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    renderFlow();
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar Yara/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Pix' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar venda' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Estoque insuficiente.',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar venda' }),
    );
    expect(fetchMock.mock.calls[2][0]).toBe('/api/sales/sale-1');
    expect(fetchMock.mock.calls[2][1].method).toBe('PATCH');
    expect(fetchMock.mock.calls[1][1].headers['Idempotency-Key']).not.toBe(
      fetchMock.mock.calls[3][1].headers['Idempotency-Key'],
    );
  });
});

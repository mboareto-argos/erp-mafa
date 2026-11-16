import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewPurchaseFlow } from './new-purchase-flow';

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
    variants: [{ id: 'v1' }],
    prices: [{ salePrice: '249.9' }],
  },
];
const ok = (body: unknown) => ({ ok: true, json: async () => body });

function renderFlow(
  overrides: Partial<Parameters<typeof NewPurchaseFlow>[0]> = {},
) {
  return render(
    <NewPurchaseFlow
      products={products}
      suppliers={[{ id: 's1', name: 'Importadora Oriente' }]}
      accounts={[{ id: 'acc', name: 'Conta PJ' }]}
      canCreateProduct
      canCreateSupplier
      canPay
      draft={null}
      {...overrides}
    />,
  );
}

async function fillYara(cost = '12000') {
  await userEvent.type(
    screen.getByRole('searchbox', { name: /Buscar produto/ }),
    'LAT-YARA-100{Enter}',
  );
  await userEvent.type(
    screen.getByLabelText(/Quanto pagou por unidade de Yara/),
    cost,
  );
}

beforeEach(() => router.push.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe('NewPurchaseFlow', () => {
  it('código desconhecido + Enter abre o cadastro do produto já com o código', async () => {
    renderFlow();
    await userEvent.type(
      screen.getByRole('searchbox', { name: /Buscar produto/ }),
      '6291108730515{Enter}',
    );
    expect(screen.getByText('Novo produto')).toBeInTheDocument();
    expect(screen.getByLabelText(/Código/)).toHaveValue('6291108730515');
  });

  it('sem permissão de catálogo, não oferece cadastrar produto (DS-PERM-001)', async () => {
    renderFlow({ canCreateProduct: false });
    expect(
      screen.queryByRole('button', { name: /Cadastrar produto/ }),
    ).toBeNull();
  });

  it('não avança sem o custo dos itens', async () => {
    renderFlow();
    await userEvent.type(
      screen.getByRole('searchbox', { name: /Buscar produto/ }),
      'LAT-YARA-100{Enter}',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe quanto você pagou por unidade de Yara',
    );
  });

  it('"Já chegou" + "Já paguei": cria, pede, recebe com frete e quita a conta a pagar', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        ok({
          id: 'pur-1',
          items: [{ id: 'item-1', productVariantId: 'v1', quantity: '1' }],
        }),
      )
      .mockResolvedValueOnce(ok({ id: 'pur-1', status: 'ordered' }))
      .mockResolvedValueOnce(
        ok({ id: 'pur-1', payables: [{ id: 'pay-1', amountOriginal: '130' }] }),
      )
      .mockResolvedValueOnce(ok({ id: 'pay-1', status: 'paid' }));
    vi.stubGlobal('fetch', fetchMock);
    renderFlow();
    await fillYara();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('radio', { name: /Já chegou/ }));
    await userEvent.type(
      screen.getByLabelText(/Frete e outros custos/),
      '1000',
    );
    const calculated = screen.getByText(
      /Custo final por unidade/,
    ).parentElement!;
    expect(within(calculated).getByText(/R\$\s130,00/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Já paguei/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(
      screen.getByText(/Lançar a saída de R\$\s130,00 em Conta PJ/),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar compra' }),
    );

    const calls = fetchMock.mock.calls.map(([url, init]) => [url, init.method]);
    expect(calls).toEqual([
      ['/api/purchasing/purchases', 'POST'],
      ['/api/purchasing/purchases/pur-1/order', 'POST'],
      ['/api/purchasing/purchases/pur-1/receive', 'POST'],
      ['/api/finance/payables/pay-1/pay', 'POST'],
    ]);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      items: [{ purchaseItemId: 'item-1', quantityReceived: 1 }],
      additionalCosts: [{ type: 'frete', amount: 10 }],
      installmentPlan: {
        count: 1,
        firstDueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      },
    });
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({
      financialAccountId: 'acc',
      amount: 130,
    });
    expect(router.push).toHaveBeenCalledWith('/compras');
  });

  it('"Ainda vai chegar" só cria e registra o pedido (em trânsito)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ id: 'pur-1', items: [] }))
      .mockResolvedValueOnce(ok({ id: 'pur-1', status: 'ordered' }));
    vi.stubGlobal('fetch', fetchMock);
    renderFlow();
    await fillYara();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(
      screen.getByRole('radio', { name: /Ainda vai chegar/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar compra' }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      '/api/purchasing/purchases/pur-1/order',
    );
  });

  it('se o pagamento falhar, a nova tentativa só paga (não recria nem recebe de novo)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        ok({
          id: 'pur-1',
          items: [{ id: 'item-1', productVariantId: 'v1', quantity: '1' }],
        }),
      )
      .mockResolvedValueOnce(ok({}))
      .mockResolvedValueOnce(
        ok({ id: 'pur-1', payables: [{ id: 'pay-1', amountOriginal: '120' }] }),
      )
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Saldo indisponível.' }),
      })
      .mockResolvedValueOnce(ok({}));
    vi.stubGlobal('fetch', fetchMock);
    renderFlow();
    await fillYara();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(screen.getByRole('radio', { name: /Já chegou/ }));
    await userEvent.click(screen.getByRole('radio', { name: /Já paguei/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar compra' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'estoque atualizado, mas o pagamento não foi lançado',
    );
    expect(
      screen.queryByRole('button', { name: 'Voltar uma etapa' }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[4][0]).toBe('/api/finance/payables/pay-1/pay');
    expect(router.push).toHaveBeenCalledWith('/compras');
  });
});

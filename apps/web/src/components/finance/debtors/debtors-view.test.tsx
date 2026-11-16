import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { groupDebtors, type ReceivableItem } from './debtors';
import { DebtorsView } from './debtors-view';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DrawerDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

const TODAY = '2026-11-16';
const receivables: ReceivableItem[] = [
  {
    id: 'r1',
    description: 'parcela',
    amountOriginal: '136.60',
    amountReceived: '0',
    dueDate: '2026-11-11T00:00:00.000Z',
    status: 'pending',
    installmentNumber: 1,
    installmentCount: 3,
    customer: { id: 'c1', name: 'Juliana Costa', whatsapp: '11988887777' },
  },
  {
    id: 'r2',
    description: 'parcela',
    amountOriginal: '159.90',
    amountReceived: '0',
    dueDate: '2026-12-26T00:00:00.000Z',
    status: 'pending',
    installmentNumber: 1,
    installmentCount: 1,
    customer: { id: 'c2', name: 'Fernanda Rocha' },
  },
];

function renderView(props: Partial<Parameters<typeof DebtorsView>[0]> = {}) {
  return render(
    <DebtorsView
      debtors={groupDebtors(receivables, TODAY)}
      today={TODAY}
      companyName="MAFA Store"
      accounts={[{ id: 'caixa', name: 'Caixa da loja' }]}
      canReceive
      canSell
      {...props}
    />,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('DebtorsView', () => {
  it('atrasado aparece primeiro, aberto, com texto (não só cor) e link do WhatsApp', () => {
    renderView();
    expect(screen.getByText('Atrasado há 5 dias')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Cobrar no WhatsApp/ });
    expect(link).toHaveAttribute(
      'href',
      expect.stringMatching(
        /^https:\/\/wa\.me\/5511988887777\?text=Oi%2C%20Juliana/,
      ),
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('card "Atrasado" filtra a lista (DS-KPI-001)', async () => {
    renderView();
    await userEvent.click(screen.getByRole('button', { name: /^Atrasado/ }));
    expect(
      screen.getByRole('heading', { name: /Atrasados · 1 cliente/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Fernanda Rocha')).toBeNull();
  });

  it('"Recebi" registra o recebimento com chave de idempotência', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    renderView();
    await userEvent.click(
      screen.getByRole('button', {
        name: /Registrar recebimento: Parcela 1 de 3 de Juliana/,
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Registrar R\$/ }),
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/finance/receivables/r1/pay');
    expect(init.headers['Idempotency-Key']).toBeTruthy();
    expect(JSON.parse(init.body)).toEqual({
      financialAccountId: 'caixa',
      amount: 136.6,
    });
    expect(router.refresh).toHaveBeenCalled();
  });

  it('sem permissão de receber, o botão "Recebi" não aparece (DS-PERM-001)', () => {
    renderView({ canReceive: false, accounts: [] });
    expect(
      screen.queryByRole('button', { name: /Registrar recebimento/ }),
    ).toBeNull();
  });

  it('ninguém devendo: estado vazio orientativo com atalho para vender', () => {
    renderView({ debtors: [] });
    expect(screen.getByText('Ninguém está devendo agora')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova venda' })).toHaveAttribute(
      'href',
      '/vendas/nova',
    );
  });
});

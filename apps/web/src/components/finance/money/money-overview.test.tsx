import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoneyOverview } from './money-overview';

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

const pj = {
  id: 'pj',
  name: 'Conta PJ',
  kind: 'store' as const,
  status: 'active',
  balance: '1000',
  hasOpeningBalance: true,
};
const bolso = {
  id: 'bolso',
  name: 'Meu bolso',
  kind: 'owner' as const,
  status: 'active',
  balance: '-300',
  hasOpeningBalance: false,
};
const ok = () =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

function renderOverview(accounts = [pj, bolso], canManage = true) {
  return render(
    <MoneyOverview
      accounts={accounts}
      receivableCents={97290}
      payableCents={15000}
      overdueCount={0}
      canManage={canManage}
      canSeeReceivables
      canSeePayables
    />,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('MoneyOverview', () => {
  it('mostra o dinheiro da loja sem o bolso e quanto a loja deve ao proprietário', () => {
    renderOverview();
    expect(
      screen.getByRole('heading', { name: /Dinheiro da loja hoje/ })
        .parentElement,
    ).toHaveTextContent(/R\$\s1\.000,00/);
    expect(screen.getByText(/A loja te deve/)).toHaveTextContent(/R\$\s300,00/);
  });

  it('conferir com o banco: mostra a diferença e envia saldo e motivo', async () => {
    const fetchMock = ok();
    vi.stubGlobal('fetch', fetchMock);
    renderOverview();
    await userEvent.click(
      screen.getByRole('button', { name: /Conferir com o banco/ }),
    );
    await userEvent.type(
      screen.getByLabelText('Saldo que o banco mostra'),
      '98735',
    );
    expect(screen.getByText('Ajuste (sai)')).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Motivo da diferença'),
      'Tarifa do banco',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/financial-accounts/pj/reconcile');
    expect(JSON.parse(init.body)).toMatchObject({
      actualBalance: 987.35,
      reason: 'Tarifa do banco',
    });
    expect(router.refresh).toHaveBeenCalled();
  });

  it('virou aporte: não deixa passar do que a loja deve', async () => {
    const fetchMock = ok();
    vi.stubGlobal('fetch', fetchMock);
    renderOverview();
    await userEvent.click(screen.getByRole('button', { name: 'Virou aporte' }));
    const input = screen.getByLabelText('Quanto vira aporte?');
    await userEvent.clear(input);
    await userEvent.type(input, '40000');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /não pode passar de R\$\s300,00/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reembolsar: transferência da conta da loja para o bolso, com chave de idempotência', async () => {
    const fetchMock = ok();
    vi.stubGlobal('fetch', fetchMock);
    renderOverview();
    await userEvent.click(screen.getByRole('button', { name: /Reembolsar/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/finance/cash-flow/transfers');
    expect(init.headers['Idempotency-Key']).toBeTruthy();
    expect(JSON.parse(init.body)).toMatchObject({
      fromAccountId: 'pj',
      toAccountId: 'bolso',
      amount: 300,
    });
  });

  it('sem conta do proprietário, oferece criar "Meu bolso"; sem permissão, só exibe', () => {
    const { unmount } = renderOverview([pj]);
    expect(
      screen.getByRole('button', { name: /Criar "Meu bolso"/ }),
    ).toBeInTheDocument();
    unmount();
    renderOverview([pj, bolso], false);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

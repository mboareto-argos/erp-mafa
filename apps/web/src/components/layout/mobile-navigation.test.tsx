import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileNavigation } from './mobile-navigation';

const nav = vi.hoisted(() => ({
  pathname: '/inicio',
  search: new URLSearchParams(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.search,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const props = {
  userName: 'Dona MAFA',
  roleName: 'owner',
  companyName: 'MAFA Store',
};

beforeEach(() => {
  nav.pathname = '/inicio';
  nav.search = new URLSearchParams();
});

describe('MobileNavigation', () => {
  it('mostra as abas permitidas, "Mais" e o botão de ação rápida', () => {
    render(
      <MobileNavigation
        {...props}
        permissions={[
          'view_sales',
          'view_inventory',
          'view_customers',
          'manage_sales',
        ]}
      />,
    );
    const tabs = screen.getByRole('navigation', {
      name: 'Navegação principal',
    });
    expect(tabs).toHaveTextContent('Início');
    expect(tabs).toHaveTextContent('Vendas');
    expect(tabs).toHaveTextContent('Estoque');
    expect(tabs).not.toHaveTextContent('Financeiro');
    expect(screen.getByRole('button', { name: /Mais/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Ações rápidas/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('sem nenhuma ação permitida, o botão + não é renderizado', () => {
    render(<MobileNavigation {...props} permissions={['view_sales']} />);
    expect(screen.queryByRole('button', { name: /Ações rápidas/ })).toBeNull();
  });

  it('esconde o botão + durante um formulário em tela cheia (DS-LAYOUT-002)', () => {
    nav.search = new URLSearchParams('new=sale');
    render(<MobileNavigation {...props} permissions={['manage_sales']} />);
    expect(screen.queryByRole('button', { name: /Ações rápidas/ })).toBeNull();
  });

  it('"Mais" lista as telas que não cabem nas abas', async () => {
    render(
      <MobileNavigation
        {...props}
        permissions={[
          'view_sales',
          'view_customers',
          'view_catalog',
          'view_purchasing',
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Mais/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Clientes');
    expect(dialog).toHaveTextContent('Produtos');
    expect(dialog).toHaveTextContent('Compras');
    expect(dialog).toHaveTextContent('Fornecedores');
    expect(dialog).toHaveTextContent('Sair da conta');
  });
});

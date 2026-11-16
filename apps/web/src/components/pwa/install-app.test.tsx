import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  value: { installed: false, platform: 'ios' as 'ios' | 'prompt' | 'none' },
}));
const promptInstall = vi.hoisted(() => vi.fn(async () => true));
vi.mock('@/lib/install-prompt', () => ({
  useInstallState: () => state.value,
  promptInstall,
}));

import { InstallAppButton, InstallAppCard } from './install-app';

beforeEach(() => {
  localStorage.clear();
  state.value = { installed: false, platform: 'ios' };
  promptInstall.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe('convite para instalar o app', () => {
  it('iPhone: "Instalar" abre o passo a passo (Compartilhar → Adicionar à Tela de Início)', async () => {
    render(<InstallAppCard />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Instalar' }),
    );
    expect(await screen.findByText('Instalar no iPhone')).toBeInTheDocument();
    expect(screen.getByText('Adicionar à Tela de Início')).toBeInTheDocument();
  });

  it('Android: usa o pedido nativo de instalação', async () => {
    state.value = { installed: false, platform: 'prompt' };
    render(<InstallAppButton />);
    await userEvent.click(
      screen.getByRole('button', { name: /Instalar app no celular/ }),
    );
    expect(promptInstall).toHaveBeenCalled();
  });

  it('dispensar esconde o cartão e lembra a escolha', async () => {
    const { unmount } = render(<InstallAppCard />);
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Dispensar convite para instalar',
      }),
    );
    expect(screen.queryByRole('button', { name: 'Instalar' })).toBeNull();
    unmount();
    render(<InstallAppCard />);
    expect(screen.queryByRole('button', { name: 'Instalar' })).toBeNull();
  });

  it('já instalado: nada aparece', () => {
    state.value = { installed: true, platform: 'none' };
    render(
      <>
        <InstallAppCard />
        <InstallAppButton />
      </>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});

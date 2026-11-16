import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomerPicker, formatPhone } from './customer-picker';

afterEach(() => vi.unstubAllGlobals());

describe('CustomerPicker', () => {
  it('cadastra o cliente ali mesmo e já o seleciona na venda', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'new-1',
        name: 'Carla Mendes',
        whatsapp: '(11) 98888-7777',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    const onCreated = vi.fn();
    render(
      <CustomerPicker
        customers={[]}
        value=""
        onChange={onChange}
        onCreated={onCreated}
        canCreate
      />,
    );
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar cliente' }),
      'Carla Mendes',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Cadastrar "Carla Mendes"' }),
    );
    expect(screen.getByLabelText('Nome')).toHaveValue('Carla Mendes');
    await userEvent.type(screen.getByLabelText(/WhatsApp/), '11988887777');
    await userEvent.click(
      screen.getByRole('button', { name: /Cadastrar e usar/ }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/customers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Carla Mendes',
          whatsapp: '(11) 98888-7777',
        }),
      }),
    );
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-1' }),
    );
    expect(onChange).toHaveBeenCalledWith('new-1');
  });

  it('sem permissão de cadastrar cliente, o atalho não aparece (DS-PERM-001)', () => {
    render(
      <CustomerPicker
        customers={[{ id: 'c1', name: 'Ana' }]}
        value=""
        onChange={vi.fn()}
        onCreated={vi.fn()}
        canCreate={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /Cadastrar/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ana' })).toBeInTheDocument();
  });

  it('máscara de celular aceita só dígitos', () => {
    expect(formatPhone('11988887777')).toBe('(11) 98888-7777');
    expect(formatPhone('(11) 3333-4444')).toBe('(11) 3333-4444');
    expect(formatPhone('11988887777999')).toBe('(11) 98888-7777');
  });
});

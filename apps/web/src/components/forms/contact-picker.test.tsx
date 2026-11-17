import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatPhone } from '@/lib/phone';
import { ContactPicker } from './contact-picker';

afterEach(() => vi.unstubAllGlobals());

describe('ContactPicker', () => {
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
      <ContactPicker
        kind="customer"
        contacts={[]}
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

  it('cliente que aceita ofertas já é cadastrado com o aceite (BR §10.9, regra 9)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-2', name: 'Bia' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <ContactPicker
        kind="customer"
        contacts={[]}
        value=""
        onChange={vi.fn()}
        onCreated={vi.fn()}
        canCreate
      />,
    );
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar cliente' }),
      'Bia',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Cadastrar "Bia"' }),
    );
    const consent = screen.getByRole('checkbox', {
      name: /Aceita receber ofertas/,
    });
    expect(consent).not.toBeChecked();
    await userEvent.click(consent);
    await userEvent.click(
      screen.getByRole('button', { name: /Cadastrar e usar/ }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: 'Bia',
      marketingConsentSource: 'in_person',
    });
  });

  it('sem permissão de cadastrar cliente, o atalho não aparece (DS-PERM-001)', () => {
    render(
      <ContactPicker
        kind="customer"
        contacts={[{ id: 'c1', name: 'Ana' }]}
        value=""
        onChange={vi.fn()}
        onCreated={vi.fn()}
        canCreate={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /Cadastrar/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ana' })).toBeInTheDocument();
  });

  it('fornecedor usa o cadastro de fornecedores', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 's1', name: 'Importadora Oriente' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    render(
      <ContactPicker
        kind="supplier"
        contacts={[]}
        value=""
        onChange={onChange}
        onCreated={vi.fn()}
        canCreate
      />,
    );
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar fornecedor' }),
      'Importadora Oriente',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Cadastrar "Importadora Oriente"' }),
    );
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /Cadastrar e usar/ }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/purchasing/suppliers',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(onChange).toHaveBeenCalledWith('s1');
  });

  it('máscara de celular aceita só dígitos', () => {
    expect(formatPhone('11988887777')).toBe('(11) 98888-7777');
    expect(formatPhone('(11) 3333-4444')).toBe('(11) 3333-4444');
    expect(formatPhone('11988887777999')).toBe('(11) 98888-7777');
  });
});

import { normalizePixKey } from './pix-key.schema';

describe('normalizePixKey', () => {
  it('CPF e CNPJ: só dígitos e dígito verificador válido', () => {
    expect(normalizePixKey('cpf', '529.982.247-25')).toBe('52998224725');
    expect(normalizePixKey('cpf', '529.982.247-24')).toBeNull();
    expect(normalizePixKey('cpf', '111.111.111-11')).toBeNull();
    expect(normalizePixKey('cnpj', '11.222.333/0001-81')).toBe(
      '11222333000181',
    );
    expect(normalizePixKey('cnpj', '11.222.333/0001-80')).toBeNull();
  });

  it('telefone ganha +55; e-mail e aleatória em minúsculas', () => {
    expect(normalizePixKey('phone', '(11) 99999-0001')).toBe('+5511999990001');
    expect(normalizePixKey('phone', '+55 11 99999-0001')).toBe(
      '+5511999990001',
    );
    expect(normalizePixKey('phone', '9999')).toBeNull();
    expect(normalizePixKey('email', ' Loja@Exemplo.com ')).toBe(
      'loja@exemplo.com',
    );
    expect(normalizePixKey('email', 'sem-arroba')).toBeNull();
    expect(
      normalizePixKey('random', '123E4567-E12B-12D1-A456-426655440000'),
    ).toBe('123e4567-e12b-12d1-a456-426655440000');
    expect(normalizePixKey('random', 'abc')).toBeNull();
  });
});

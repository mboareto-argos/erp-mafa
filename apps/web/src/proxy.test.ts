// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

const request = (path: string, cookies: Record<string, string> = {}) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), {
    headers: {
      cookie: Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; '),
    },
  });
const location = (response: Response) => response.headers.get('location');

describe('proxy de sessão', () => {
  it('app fechado > 15 min: renova pela sessão de 30 dias e volta para onde ia', () => {
    const response = proxy(
      request('/financeiro/quem-me-deve?f=1', { erp_mafa_refresh: 'r' }),
    );
    const target = new URL(location(response)!);
    expect(target.pathname).toBe('/api/session/resume');
    expect(target.searchParams.get('next')).toBe(
      '/financeiro/quem-me-deve?f=1',
    );
  });

  it('sem nenhuma sessão: vai para o login', () => {
    expect(location(proxy(request('/vendas')))).toBe(
      'http://localhost:3000/entrar',
    );
  });

  it('logado não vê a tela de login', () => {
    expect(location(proxy(request('/entrar', { erp_mafa_access: 'a' })))).toBe(
      'http://localhost:3000/inicio',
    );
  });

  it('Importações também é protegida', () => {
    expect(location(proxy(request('/importacoes')))).toBe(
      'http://localhost:3000/entrar',
    );
  });
});

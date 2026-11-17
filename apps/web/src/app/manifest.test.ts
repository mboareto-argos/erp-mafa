import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('manifesto do app instalável', () => {
  it('abre em tela cheia no Início, com ícones (inclusive maskable) e atalhos', () => {
    const value = manifest();
    expect(value).toMatchObject({
      name: 'Vendaí',
      short_name: 'Vendaí',
      display: 'standalone',
      start_url: '/inicio',
      lang: 'pt-BR',
    });
    expect(value.icons?.map((icon) => icon.sizes)).toEqual([
      '192x192',
      '512x512',
      '512x512',
    ]);
    expect(value.icons?.some((icon) => icon.purpose === 'maskable')).toBe(true);
    expect(value.shortcuts?.map((shortcut) => shortcut.url)).toEqual([
      '/vendas/nova',
      '/produtos/consultar',
      '/compras/nova',
      '/financeiro/quem-me-deve',
    ]);
  });
});

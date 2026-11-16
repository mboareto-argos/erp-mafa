import { describe, expect, it } from 'vitest';
import {
  isActivePath,
  splitMobileNavigation,
  visibleGroups,
  visibleQuickActions,
} from './navigation-config';

const OWNER = [
  'view_sales',
  'view_customers',
  'view_catalog',
  'view_purchasing',
  'view_inventory',
  'manage_imports',
  'view_financial_accounts',
  'view_company_settings',
  'manage_sales',
  'manage_receivables',
  'manage_expenses',
  'manage_purchasing',
  'adjust_stock',
  'manage_catalog',
  'manage_customers',
];

describe('navegação condicionada por permissão (DS-PERM-001)', () => {
  it('oculta itens sem permissão em vez de mostrá-los bloqueados', () => {
    const groups = visibleGroups(['view_sales']);
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toEqual(['/inicio', '/vendas']);
    expect(groups.map((g) => g.label)).not.toContain('Financeiro');
  });

  it('vendedor não vê Financeiro nem Configurações nas abas do celular', () => {
    const { tabs, more } = splitMobileNavigation([
      'view_sales',
      'view_customers',
      'view_catalog',
      'view_inventory',
    ]);
    expect(tabs.map((t) => t.href)).toEqual(['/inicio', '/vendas', '/estoque']);
    expect(more.map((m) => m.href)).toEqual(['/clientes', '/produtos']);
  });

  it('proprietário alcança todas as telas pelo celular (abas + Mais)', () => {
    const { tabs, more } = splitMobileNavigation(OWNER);
    expect(tabs.map((t) => t.href)).toEqual([
      '/inicio',
      '/vendas',
      '/estoque',
      '/financeiro',
    ]);
    const all = visibleGroups(OWNER).flatMap((g) => g.items.map((i) => i.href));
    expect([...tabs, ...more].map((i) => i.href).sort()).toEqual(all.sort());
  });

  it('ações rápidas seguem a ordem de frequência do DS §7.3', () => {
    const labels = visibleQuickActions(OWNER).map((a) => a.label);
    expect(labels.slice(0, 6)).toEqual([
      'Nova venda',
      'Novo recebimento',
      'Nova despesa',
      'Nova compra',
      'Ajuste de estoque',
      'Novo produto',
    ]);
    expect(visibleQuickActions(['view_sales'])).toEqual([]);
  });

  it('mantém o item ativo em sub-rotas sem confundir prefixos', () => {
    expect(isActivePath('/vendas/123', '/vendas')).toBe(true);
    expect(isActivePath('/vendas', '/vendas')).toBe(true);
    expect(isActivePath('/vendas-antigas', '/vendas')).toBe(false);
  });
});

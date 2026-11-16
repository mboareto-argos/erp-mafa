import type { IconName } from './app-icon';

// Fonte única da navegação do app (sidebar desktop, abas do celular, aba
// "Mais" e ação rápida). Itens sem permissão são OCULTADOS, nunca
// desabilitados (DS-NAV-001 / DS-PERM-001) — a autorização real continua
// no backend (TA-SEC-001).

export type NavigationItem = {
  href: string;
  label: string;
  icon: IconName;
  permission?: string;
};
export type NavigationGroup = {
  label: string;
  items: readonly NavigationItem[];
};
export type QuickAction = {
  label: string;
  description: string;
  href: string;
  icon: IconName;
  permission: string;
};

export const navigationGroups: readonly NavigationGroup[] = [
  {
    label: 'Visão geral',
    items: [{ href: '/inicio', label: 'Início', icon: 'home' }],
  },
  {
    label: 'Comercial',
    items: [
      {
        href: '/vendas',
        label: 'Vendas',
        icon: 'sales',
        permission: 'view_sales',
      },
      {
        href: '/clientes',
        label: 'Clientes',
        icon: 'customers',
        permission: 'view_customers',
      },
      {
        href: '/produtos',
        label: 'Produtos',
        icon: 'products',
        permission: 'view_catalog',
      },
    ],
  },
  {
    label: 'Suprimentos',
    items: [
      {
        href: '/compras',
        label: 'Compras',
        icon: 'purchases',
        permission: 'view_purchasing',
      },
      {
        href: '/fornecedores',
        label: 'Fornecedores',
        icon: 'suppliers',
        permission: 'view_purchasing',
      },
      {
        href: '/estoque',
        label: 'Estoque',
        icon: 'inventory',
        permission: 'view_inventory',
      },
      {
        href: '/importacoes',
        label: 'Importações',
        icon: 'imports',
        permission: 'manage_imports',
      },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      {
        href: '/financeiro',
        label: 'Financeiro',
        icon: 'finance',
        permission: 'view_financial_accounts',
      },
      {
        href: '/financeiro/quem-me-deve',
        label: 'Quem me deve',
        icon: 'debtors',
        permission: 'view_receivables',
      },
    ],
  },
  {
    label: 'Administração',
    items: [
      {
        href: '/configuracoes',
        label: 'Configurações',
        icon: 'settings',
        permission: 'view_company_settings',
      },
    ],
  },
];

/** Destinos fixos da barra inferior no celular (DS §7.1); o resto vai para "Mais". */
export const MOBILE_TAB_HREFS = [
  '/inicio',
  '/vendas',
  '/estoque',
  '/financeiro',
] as const;

// Ordem por frequência de uso esperada (DS §7.3): venda primeiro.
export const quickActions: readonly QuickAction[] = [
  {
    label: 'Nova venda',
    description: 'Registrar uma venda e seu pagamento',
    href: '/vendas/nova',
    icon: 'sales',
    permission: 'manage_sales',
  },
  {
    label: 'Novo recebimento',
    description: 'Registrar uma conta a receber',
    href: '/financeiro?new=receivable',
    icon: 'finance',
    permission: 'manage_receivables',
  },
  {
    label: 'Nova despesa',
    description: 'Registrar saída ou conta futura',
    href: '/financeiro?new=expense',
    icon: 'finance',
    permission: 'manage_expenses',
  },
  {
    label: 'Nova compra',
    description: 'Receber mercadorias e formar estoque',
    href: '/compras/nova',
    icon: 'purchases',
    permission: 'manage_purchasing',
  },
  {
    label: 'Ajuste de estoque',
    description: 'Registrar diferença de inventário',
    href: '/estoque?new=adjustment',
    icon: 'inventory',
    permission: 'adjust_stock',
  },
  {
    label: 'Novo produto',
    description: 'Cadastrar item para compra e venda',
    href: '/produtos?new=product',
    icon: 'products',
    permission: 'manage_catalog',
  },
  {
    label: 'Novo cliente',
    description: 'Cadastrar contato comercial',
    href: '/clientes?new=customer',
    icon: 'customers',
    permission: 'manage_customers',
  },
  {
    label: 'Novo fornecedor',
    description: 'Cadastrar parceiro de compra',
    href: '/fornecedores?new=supplier',
    icon: 'suppliers',
    permission: 'manage_purchasing',
  },
  {
    label: 'Nova importação',
    description: 'Validar e migrar dados por planilha',
    href: '/importacoes?new=import',
    icon: 'imports',
    permission: 'manage_imports',
  },
];

export function visibleGroups(permissions: readonly string[]) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || permissions.includes(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function visibleQuickActions(permissions: readonly string[]) {
  return quickActions.filter((action) =>
    permissions.includes(action.permission),
  );
}

/** Divide os itens permitidos entre abas fixas do celular e a aba "Mais". */
export function splitMobileNavigation(permissions: readonly string[]) {
  const items = visibleGroups(permissions).flatMap((group) => group.items);
  const tabs = MOBILE_TAB_HREFS.map((href) =>
    items.find((item) => item.href === href),
  ).filter((item): item is NavigationItem => Boolean(item));
  const more = items.filter(
    (item) => !(MOBILE_TAB_HREFS as readonly string[]).includes(item.href),
  );
  return { tabs, more };
}

/**
 * Entre os itens de menu, o ativo é o mais específico que casa com a rota:
 * em /financeiro/quem-me-deve acende "Quem me deve", não "Financeiro".
 */
export function activeHref(pathname: string, hrefs: readonly string[]) {
  return hrefs
    .filter((href) => isActivePath(pathname, href))
    .sort((a, b) => b.length - a.length)[0];
}

/** Item ativo também em sub-rotas (ex.: /vendas/123 mantém "Vendas" ativo). */
export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const roleLabels: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  sales: 'Vendedor',
  inventory: 'Estoquista',
  finance: 'Financeiro',
  viewer: 'Consulta',
};

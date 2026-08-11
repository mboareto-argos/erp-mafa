'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SelectControl } from '@/components/ui/select-field';
import { AppIcon, type IconName } from './app-icon';

type SearchScope = 'products' | 'customers' | 'suppliers';
type QuickAction = {
  label: string;
  description: string;
  href: string;
  icon: IconName;
  permission: string;
};

const searchScopes: Record<
  SearchScope,
  { label: string; path: string; placeholder: string }
> = {
  products: {
    label: 'Produtos',
    path: '/produtos',
    placeholder: 'Buscar produtos',
  },
  customers: {
    label: 'Clientes',
    path: '/clientes',
    placeholder: 'Buscar clientes',
  },
  suppliers: {
    label: 'Fornecedores',
    path: '/fornecedores',
    placeholder: 'Buscar fornecedores',
  },
};

const quickActions: readonly QuickAction[] = [
  {
    label: 'Nova venda',
    description: 'Registrar uma venda e seu pagamento',
    href: '/vendas?new=sale',
    icon: 'sales',
    permission: 'manage_sales',
  },
  {
    label: 'Nova compra',
    description: 'Receber mercadorias e formar estoque',
    href: '/compras?new=purchase',
    icon: 'purchases',
    permission: 'manage_purchasing',
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
    label: 'Nova despesa',
    description: 'Registrar saída ou conta futura',
    href: '/financeiro?new=expense',
    icon: 'finance',
    permission: 'manage_expenses',
  },
  {
    label: 'Novo recebimento',
    description: 'Registrar uma conta a receber',
    href: '/financeiro?new=receivable',
    icon: 'finance',
    permission: 'manage_receivables',
  },
  {
    label: 'Ajuste de estoque',
    description: 'Registrar diferença de inventário',
    href: '/estoque?new=adjustment',
    icon: 'inventory',
    permission: 'adjust_stock',
  },
  {
    label: 'Nova importação',
    description: 'Validar e migrar dados por planilha',
    href: '/importacoes?new=import',
    icon: 'imports',
    permission: 'manage_imports',
  },
];

function HeaderSearch() {
  const [scope, setScope] = useState<SearchScope>('products');
  const target = searchScopes[scope];
  return (
    <form
      className="header-search"
      action={target.path}
      method="GET"
      role="search"
    >
      <AppIcon name="search" />
      <input
        aria-label={target.placeholder}
        name="q"
        placeholder={target.placeholder}
      />
      <SelectControl
        controlClassName="header-search-scope"
        aria-label="Onde buscar"
        value={scope}
        onChange={(event) => setScope(event.target.value as SearchScope)}
      >
        {Object.entries(searchScopes).map(([value, option]) => (
          <option key={value} value={value}>
            {option.label}
          </option>
        ))}
      </SelectControl>
      <button
        className="header-search-submit"
        type="submit"
        aria-label={`Buscar em ${target.label}`}
      >
        Enter
      </button>
    </form>
  );
}

function QuickActionDialog({ permissions }: { permissions: string[] }) {
  const actions = quickActions.filter((action) =>
    permissions.includes(action.permission),
  );
  if (actions.length === 0) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="header-new-button" type="button">
          <span className="header-new-icon">
            <AppIcon name="plus" />
          </span>
          Novo
        </button>
      </DialogTrigger>
      <DialogContent>
        <div className="dialog-heading">
          <div>
            <DialogTitle>O que você quer fazer?</DialogTitle>
            <DialogDescription>
              Escolha uma ação disponível para o seu perfil.
            </DialogDescription>
          </div>
          <DialogClose className="dialog-close" aria-label="Fechar">
            ×
          </DialogClose>
        </div>
        <div className="quick-action-list">
          {actions.map((action) => (
            <DialogClose asChild key={action.label}>
              <Link className="quick-action" href={action.href}>
                <span className="quick-action-icon">
                  <AppIcon name={action.icon} />
                </span>
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.description}</small>
                </span>
                <AppIcon name="chevronRight" />
              </Link>
            </DialogClose>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppHeader({
  companyName,
  userName,
  initials,
  permissions,
}: {
  companyName: string;
  userName: string;
  initials: string;
  permissions: string[];
}) {
  return (
    <header className="topbar">
      <div className="header-brand">
        <span className="brand-mark">M</span>
        <span title={companyName}>{companyName}</span>
      </div>
      <HeaderSearch />
      <div className="header-actions">
        <QuickActionDialog permissions={permissions} />
        <div className="user-chip">
          <span className="avatar">{initials}</span>
          <span>{userName}</span>
        </div>
      </div>
    </header>
  );
}

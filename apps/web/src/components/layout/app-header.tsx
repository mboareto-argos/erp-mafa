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
import { AppIcon } from './app-icon';
import { visibleQuickActions } from './navigation-config';

type SearchScope = 'products' | 'customers' | 'suppliers';
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
  const actions = visibleQuickActions(permissions);
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

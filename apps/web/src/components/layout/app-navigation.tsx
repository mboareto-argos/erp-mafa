'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppIcon } from './app-icon';
import { MobileNavigation } from './mobile-navigation';
import { isActivePath, roleLabels, visibleGroups } from './navigation-config';

export function AppNavigation({
  permissions,
  userName,
  roleName,
  companyName,
}: {
  permissions: string[];
  userName: string;
  roleName: string;
  companyName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const groups = visibleGroups(permissions);

  async function signOut() {
    await fetch('/api/session/logout', { method: 'POST' }).catch(() => null);
    router.replace('/entrar');
    router.refresh();
  }

  return (
    <>
      <nav
        className={`sidebar${collapsed ? ' is-collapsed' : ''}`}
        aria-label="Navegação principal"
      >
        <div className="sidebar-header">
          {/* Nome/inicial da empresa ativa — nunca fixo no código (DS-TENANT-001). */}
          <Link className="brand" href="/inicio">
            <span className="brand-mark">
              {companyName.charAt(0).toUpperCase()}
            </span>
            <span className="brand-text">{companyName}</span>
          </Link>
          <button
            className="sidebar-collapse"
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            aria-label={
              collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
            }
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <AppIcon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} />
          </button>
        </div>
        <div className="sidebar-groups">
          {groups.map((group) => (
            <section className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    className="nav-link"
                    href={item.href}
                    key={item.href}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-symbol">
                      <AppIcon name={item.icon} />
                    </span>
                    <span className="nav-text">{item.label}</span>
                    {group.label !== 'Visão geral' && (
                      <span className="nav-chevron">
                        <AppIcon name="chevronRight" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </section>
          ))}
        </div>
        <div className="sidebar-footer">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="sidebar-account w-full cursor-pointer rounded-md border-0 bg-transparent text-left hover:bg-white/5"
                aria-label={`Conta de ${userName}`}
              >
                <span className="account-shield">
                  <AppIcon name="shield" />
                </span>
                <span className="sidebar-account-copy">
                  <strong>{userName}</strong>
                  <small>{roleLabels[roleName] ?? roleName}</small>
                </span>
                <span className="account-chevron">
                  <AppIcon name="chevronDown" />
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuItem
                onSelect={signOut}
                className="flex min-h-10 cursor-pointer items-center rounded-md px-3 text-sm font-semibold text-neutral-900 outline-0 data-[highlighted]:bg-neutral-50"
              >
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
      <Suspense>
        <MobileNavigation
          permissions={permissions}
          userName={userName}
          roleName={roleName}
          companyName={companyName}
        />
      </Suspense>
    </>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { AppIcon } from './app-icon';
import {
  isActivePath,
  roleLabels,
  splitMobileNavigation,
  visibleQuickActions,
} from './navigation-config';

// Navegação do celular (DS §5.4 e §7.1): barra inferior com Início, Vendas,
// Estoque, Financeiro e "Mais", mais o botão de ação flutuante (+) com as
// ações rápidas. Só aparece abaixo de 600px (--bp-sm); acima disso vale o
// menu lateral.

const tabClass =
  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-neutral-500 transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-accent';

export function MobileNavigation({
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { tabs, more } = splitMobileNavigation(permissions);
  const actions = visibleQuickActions(permissions);
  const moreActive = more.some((item) => isActivePath(pathname, item.href));
  // DS-LAYOUT-002: o botão flutuante some durante o preenchimento de
  // formulários em tela cheia (abertos via ?new= ou ?edit=).
  const formOpen = searchParams.has('new') || searchParams.has('edit');

  async function signOut() {
    setSigningOut(true);
    await fetch('/api/session/logout', { method: 'POST' }).catch(() => null);
    router.replace('/entrar');
    router.refresh();
  }

  return (
    <>
      {actions.length > 0 && !formOpen && (
        <button
          type="button"
          onClick={() => setActionsOpen(true)}
          aria-label="Ações rápidas: nova venda, compra, despesa…"
          className="fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full bg-brand-accent text-neutral-950 shadow-lg transition-transform duration-[120ms] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 sm:hidden [&_svg]:size-7"
        >
          <AppIcon name="plus" />
        </button>
      )}

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-neutral-100 bg-neutral-0/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        style={{
          gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))`,
        }}
      >
        {tabs.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(tabClass, active && 'text-brand-accent-hover')}
            >
              <span
                className={cn(
                  'grid h-7 w-12 place-items-center rounded-full [&_svg]:size-5',
                  active && 'bg-brand-accent-subtle',
                )}
              >
                <AppIcon name={item.icon} />
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={cn(tabClass, moreActive && 'text-brand-accent-hover')}
        >
          <span
            className={cn(
              'grid h-7 w-12 place-items-center rounded-full [&_svg]:size-5',
              moreActive && 'bg-brand-accent-subtle',
            )}
          >
            <AppIcon name="menu" />
          </span>
          {/* Texto em span: o reset global de <button> (font: inherit) anula text-xs. */}
          <span className="text-xs">Mais</span>
        </button>
      </nav>

      <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>O que você quer fazer?</DrawerTitle>
            <DrawerDescription>
              Atalhos disponíveis para o seu perfil.
            </DrawerDescription>
          </DrawerHeader>
          <ul className="grid gap-1 overflow-y-auto px-2 pb-4">
            {actions.map((action, index) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  onClick={() => setActionsOpen(false)}
                  className={cn(
                    'flex min-h-14 items-center gap-3 rounded-md px-3 py-2 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-brand-accent',
                    index === 0 && 'bg-brand-accent-subtle',
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-50 text-brand-accent-hover [&_svg]:size-5">
                    <AppIcon name={action.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-md font-semibold text-neutral-900">
                      {action.label}
                    </strong>
                    <span className="block truncate text-sm text-neutral-500">
                      {action.description}
                    </span>
                  </span>
                  <AppIcon
                    name="chevronRight"
                    className="size-5 text-neutral-300"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerHeader className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-accent-subtle font-bold text-brand-accent-hover">
              {companyName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <DrawerTitle className="truncate">{companyName}</DrawerTitle>
              <DrawerDescription className="mt-0 truncate">
                {userName} · {roleLabels[roleName] ?? roleName}
              </DrawerDescription>
            </span>
          </DrawerHeader>
          <ul className="grid grid-cols-3 gap-2 overflow-y-auto px-4 pb-4">
            {more.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-22 flex-col items-center justify-center gap-2 rounded-lg border border-neutral-100 px-1 py-3 text-center text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-brand-accent [&_svg]:size-6',
                      active &&
                        'border-brand-accent bg-brand-accent-subtle text-brand-accent-hover',
                    )}
                  >
                    <AppIcon name={item.icon} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-neutral-100 px-4 py-3">
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="flex min-h-11 w-full items-center justify-center rounded-md text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              <span className="text-sm">
                {signingOut ? 'Saindo…' : 'Sair da conta'}
              </span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

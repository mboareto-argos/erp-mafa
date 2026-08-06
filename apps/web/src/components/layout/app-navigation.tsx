"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon, type IconName } from "./app-icon";

type NavigationItem = { href: string; label: string; icon: IconName; permission?: string };
type NavigationGroup = { label: string; items: readonly NavigationItem[] };

const navigationGroups: readonly NavigationGroup[] = [
  { label: "Visão geral", items: [{ href: "/inicio", label: "Início", icon: "home" }] },
  { label: "Comercial", items: [{ href: "/vendas", label: "Vendas", icon: "sales", permission: "view_sales" }, { href: "/clientes", label: "Clientes", icon: "customers", permission: "view_customers" }, { href: "/produtos", label: "Produtos", icon: "products", permission: "view_catalog" }] },
  { label: "Suprimentos", items: [{ href: "/compras", label: "Compras", icon: "purchases", permission: "view_purchasing" }, { href: "/fornecedores", label: "Fornecedores", icon: "suppliers", permission: "view_purchasing" }, { href: "/estoque", label: "Estoque", icon: "inventory", permission: "view_inventory" }, { href: "/importacoes", label: "Importações", icon: "imports", permission: "manage_imports" }] },
  { label: "Financeiro", items: [{ href: "/financeiro", label: "Financeiro", icon: "finance", permission: "view_financial_accounts" }] },
];

const roleLabels: Record<string, string> = { owner: "Proprietário", admin: "Administrador", manager: "Gerente", seller: "Vendedor", viewer: "Consulta" };

export function AppNavigation({ permissions, userName, roleName }: { permissions: string[]; userName: string; roleName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const groups = navigationGroups.map(group => ({ ...group, items: group.items.filter(item => !item.permission || permissions.includes(item.permission)) })).filter(group => group.items.length > 0);
  const mobileItems = groups.flatMap(group => group.items).filter(item => ["/inicio", "/vendas", "/estoque", "/financeiro"].includes(item.href));

  return <>
    <nav className={`sidebar${collapsed ? " is-collapsed" : ""}`} aria-label="Navegação principal">
      <div className="sidebar-header"><Link className="brand" href="/inicio"><span className="brand-mark">M</span><span className="brand-text">MAFA Store</span></Link><button className="sidebar-collapse" type="button" onClick={() => setCollapsed(current => !current)} aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"} title={collapsed ? "Expandir menu" : "Recolher menu"}><AppIcon name={collapsed ? "chevronsRight" : "chevronsLeft"} /></button></div>
      <div className="sidebar-groups">{groups.map(group => <section className="nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.items.map(item => { const active = pathname === item.href; return <Link className="nav-link" href={item.href} key={item.href} aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined}><span className="nav-symbol"><AppIcon name={item.icon} /></span><span className="nav-text">{item.label}</span>{group.label !== "Visão geral" && <span className="nav-chevron"><AppIcon name="chevronRight" /></span>}</Link>; })}</section>)}</div>
      <div className="sidebar-footer"><div className="sidebar-account"><span className="account-shield"><AppIcon name="shield" /></span><span className="sidebar-account-copy"><strong>{userName}</strong><small>{roleLabels[roleName] ?? roleName}</small></span><span className="account-chevron"><AppIcon name="chevronDown" /></span></div></div>
    </nav>
    <nav className="mobile-nav" aria-label="Navegação móvel" style={{ "--mobile-nav-items": mobileItems.length } as CSSProperties}>{mobileItems.map(item => <Link href={item.href} key={item.href} aria-current={pathname === item.href ? "page" : undefined}><AppIcon name={item.icon} />{item.label}</Link>)}</nav>
  </>;
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryItems = [{ href: "/inicio", label: "Início", symbol: "⌂" }, { href: "/vendas", label: "Vendas", symbol: "↗", permission: "view_sales" }, { href: "/clientes", label: "Clientes", symbol: "◉", permission: "view_customers" }, { href: "/produtos", label: "Produtos", symbol: "◇", permission: "view_catalog" }, { href: "/compras", label: "Compras", symbol: "↓", permission: "view_purchasing" }, { href: "/fornecedores", label: "Fornecedores", symbol: "◌", permission: "view_purchasing" }, { href: "/estoque", label: "Estoque", symbol: "□", permission: "view_inventory" }, { href: "/financeiro", label: "Financeiro", symbol: "$", permission: "view_financial_accounts" }];

export function AppNavigation({ permissions }: { permissions: string[] }) {
  const pathname = usePathname(); const items = primaryItems.filter((item) => !item.permission || permissions.includes(item.permission));
  const mobileItems = items.filter((item) => ["/inicio", "/vendas", "/estoque", "/financeiro"].includes(item.href));
  return <><nav className="sidebar" aria-label="Navegação principal"><Link className="brand" href="/inicio"><span className="brand-mark">M</span> MAFA Store</Link><p className="nav-label">Geral</p>{items.map((item) => <Link className="nav-link" href={item.href} key={item.href} aria-current={pathname === item.href ? "page" : undefined}><span className="nav-symbol" aria-hidden="true">{item.symbol}</span>{item.label}</Link>)}</nav><nav className="mobile-nav" aria-label="Navegação móvel">{mobileItems.map((item) => <Link href={item.href} key={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}</nav></>;
}

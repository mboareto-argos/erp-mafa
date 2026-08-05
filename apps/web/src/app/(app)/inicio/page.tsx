import Link from "next/link";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Dashboard = {
  revenueGross: string; revenueNet: string; salesCount: number; averageTicket: string | null;
  expensesRealized: string; productsCount: number; lowStockCount: number; inventoryValue: string;
  receivablesOpen: string; payablesOpen: string; cashBalance: string;
  cmv?: string; grossProfit?: string; netProfitEstimated?: string; margin?: string | null;
};
const money = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const monthPeriod = () => { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: now.toISOString() }; };

export default async function DashboardPage() {
  const session = await getSession() as { user: { name: string }; permissions: string[] } | null;
  const canViewReports = session?.permissions.includes("view_reports") ?? false;
  if (!canViewReports) return <main className="page-content"><div className="page-heading"><div><h1>Olá, {session?.user.name.split(" ")[0]}</h1><p>Seu perfil mostra apenas as informações necessárias para o trabalho de hoje.</p></div></div><section className="empty-card"><h2>Vamos começar pela operação</h2><p>Use o menu para consultar produtos e estoque. Os indicadores financeiros ficam ocultos para o seu perfil.</p></section></main>;
  const { from, to } = monthPeriod();
  const dashboard = await backendAuthenticatedRequest(`/reporting/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`) as Dashboard;
  const cards = [
    { label: "Faturamento", value: money(dashboard.revenueGross), tag: "competência", href: "/vendas" },
    ...(dashboard.netProfitEstimated !== undefined ? [{ label: "Lucro líquido estimado", value: money(dashboard.netProfitEstimated), tag: "gerencial", href: "/financeiro" }] : []),
    { label: "Saldo em caixa", value: money(dashboard.cashBalance), tag: "caixa", href: "/financeiro" },
    { label: "Ticket médio", value: dashboard.averageTicket ? money(dashboard.averageTicket) : "—", tag: "competência", href: "/vendas" },
  ];
  return <main className="page-content"><div className="page-heading"><div><h1>Olá, {session?.user.name.split(" ")[0]}</h1><p>Resumo do mês atual · competência e caixa aparecem sempre identificados.</p></div></div><section className="kpi-grid">{cards.map(card => <Link className="kpi-card" href={card.href} key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.tag}</small></Link>)}</section>{dashboard.lowStockCount > 0 && <Link className="alert-card alert-link" href="/estoque"><strong>{dashboard.lowStockCount} {dashboard.lowStockCount === 1 ? "produto está" : "produtos estão"} com estoque baixo</strong><span>Veja o que precisa de atenção.</span></Link>}<section className="dashboard-grid"><article className="status-card"><h2>Visão da operação</h2><dl className="summary-list"><div><dt>Produtos ativos</dt><dd>{dashboard.productsCount}</dd></div><div><dt>Valor em estoque</dt><dd>{money(dashboard.inventoryValue)}</dd></div><div><dt>Contas a receber</dt><dd>{money(dashboard.receivablesOpen)}</dd></div><div><dt>Contas a pagar</dt><dd>{money(dashboard.payablesOpen)}</dd></div></dl></article><article className="status-card"><h2>Vendas no período</h2><p>{dashboard.salesCount} {dashboard.salesCount === 1 ? "venda registrada" : "vendas registradas"} neste mês.</p><Link className="text-link" href="/vendas">Ver vendas</Link></article></section></main>;
}

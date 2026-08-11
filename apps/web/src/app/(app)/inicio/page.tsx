import Link from 'next/link';
import { AppIcon, type IconName } from '@/components/layout/app-icon';
import { SelectControl } from '@/components/ui/select-field';
import { backendAuthenticatedRequest, getSession } from '@/lib/session';

type TrendPoint = { date: string; revenue: string; salesCount: number };
type TopProduct = {
  productId: string;
  sku: string;
  name: string;
  quantitySold: string;
  revenue: string;
  profit?: string;
};
type Dashboard = {
  period: { from: string; to: string };
  revenueGross?: string;
  revenueNet?: string;
  salesCount?: number;
  averageTicket?: string | null;
  expensesRealized?: string;
  productsCount?: number;
  lowStockCount?: number;
  inventoryValue?: string;
  receivablesOpen?: string;
  payablesOpen?: string;
  cashBalance?: string;
  overdueReceivablesCount?: number;
  overduePayablesCount?: number;
  cmv?: string;
  grossProfit?: string;
  netProfitEstimated?: string;
  margin?: string | null;
  comparison?: {
    revenueNetChangePercent?: string | null;
    salesCountChangePercent?: string | null;
    grossProfitChangePercent?: string | null;
    netProfitChangePercent?: string | null;
  };
  salesTrend?: TrendPoint[];
  topProducts?: TopProduct[];
  profitDistribution?: {
    applied: boolean;
    baseAmount: string;
    reinvestment: { rate: string; amount: string };
    proLabore: { rate: string; amount: string };
    reserve: { rate: string; amount: string };
    marketing: { rate: string; amount: string };
  };
};
type PeriodQuery = { period?: string; from?: string; to?: string };

const money = (value: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
const quantity = (value: string) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(
    Number(value),
  );
const civilDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const apiDate = (value: string, end = false) =>
  new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}-03:00`).toISOString();

function resolvePeriod(query: PeriodQuery) {
  const now = new Date();
  let from = new Date(now.getFullYear(), now.getMonth(), 1);
  let to = now;
  let key = query.period ?? 'month';
  if (key === 'last30')
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  else if (key === 'previous') {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (
    key === 'custom' &&
    query.from &&
    query.to &&
    query.from <= query.to
  ) {
    return { key, from: query.from, to: query.to };
  } else key = 'month';
  return { key, from: isoDay(from), to: isoDay(to) };
}

function Change({ value }: { value?: string | null }) {
  if (value == null) return <small>Sem período anterior comparável</small>;
  const number = Number(value);
  const positive = number >= 0;
  return (
    <small className={positive ? 'positive' : 'negative'}>
      {positive ? '↑' : '↓'}{' '}
      {Math.abs(number).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
      vs. período anterior
    </small>
  );
}

function SalesChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0)
    return (
      <div className="dashboard-chart-empty">
        <span>
          <AppIcon name="sales" />
        </span>
        <strong>Nenhuma venda neste período</strong>
        <p>Quando uma venda for confirmada, sua evolução aparecerá aqui.</p>
      </div>
    );
  const width = 720;
  const height = 230;
  const floor = 28;
  const top = 16;
  const max = Math.max(...points.map((point) => Number(point.revenue)), 1);
  const slot = width / points.length;
  const barWidth = Math.max(Math.min(slot * 0.55, 32), 5);
  return (
    <div className="dashboard-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Faturamento por dia"
      >
        <line
          x1="0"
          x2={width}
          y1={height - floor}
          y2={height - floor}
          className="chart-axis"
        />
        {points.map((point, index) => {
          const barHeight = Math.max(
            (Number(point.revenue) / max) * (height - floor - top),
            2,
          );
          const x = index * slot + (slot - barWidth) / 2;
          const y = height - floor - barHeight;
          return (
            <g key={point.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                className="chart-bar"
              >
                <title>
                  {civilDate(point.date)}: {money(point.revenue)} em{' '}
                  {point.salesCount} venda(s)
                </title>
              </rect>
              {(points.length <= 12 ||
                index % Math.ceil(points.length / 8) === 0) && (
                <text x={x + barWidth / 2} y={height - 8} textAnchor="middle">
                  {point.date.slice(8, 10)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="dashboard-chart-data">
        <summary>Ver dados em tabela</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th className="number">Vendas</th>
                <th className="number">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date}>
                  <td>{civilDate(point.date)}</td>
                  <td className="number">{point.salesCount}</td>
                  <td className="number">{money(point.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<PeriodQuery>;
}) {
  const session = (await getSession()) as {
    user: { name: string };
    permissions: string[];
  } | null;
  const has = (permission: string) =>
    session?.permissions.includes(permission) ?? false;
  if (!has('view_dashboard'))
    return (
      <main className="page-content">
        <section className="empty-card">
          <h1>Início indisponível</h1>
          <p>Seu perfil não possui acesso aos indicadores desta empresa.</p>
        </section>
      </main>
    );
  const period = resolvePeriod(await searchParams);
  const dashboard = (await backendAuthenticatedRequest(
    `/reporting/dashboard?from=${encodeURIComponent(apiDate(period.from))}&to=${encodeURIComponent(apiDate(period.to, true))}`,
  )) as Dashboard;
  const cards: Array<{
    label: string;
    value: string;
    regime: string;
    href: string;
    icon: IconName;
    change?: string | null;
  }> = [];
  if (dashboard.revenueGross !== undefined)
    cards.push({
      label: 'Faturamento',
      value: money(dashboard.revenueGross),
      regime: 'Competência',
      href: `/vendas?from=${period.from}&to=${period.to}`,
      icon: 'sales',
      change: dashboard.comparison?.revenueNetChangePercent,
    });
  if (dashboard.netProfitEstimated !== undefined)
    cards.push({
      label: 'Lucro líquido estimado',
      value: money(dashboard.netProfitEstimated),
      regime: 'Gerencial',
      href: '/financeiro?tab=expenses',
      icon: 'finance',
      change: dashboard.comparison?.netProfitChangePercent,
    });
  if (dashboard.cashBalance !== undefined)
    cards.push({
      label: 'Saldo em caixa',
      value: money(dashboard.cashBalance),
      regime: 'Caixa realizado',
      href: '/financeiro?tab=cash',
      icon: 'finance',
    });
  if (dashboard.averageTicket !== undefined)
    cards.push({
      label: 'Ticket médio',
      value: dashboard.averageTicket ? money(dashboard.averageTicket) : '—',
      regime: 'Competência',
      href: '/vendas',
      icon: 'sales',
      change: dashboard.comparison?.salesCountChangePercent,
    });
  if (dashboard.lowStockCount !== undefined && cards.length < 4)
    cards.push({
      label: 'Estoque baixo',
      value: String(dashboard.lowStockCount),
      regime: 'Posição atual',
      href: '/estoque?state=low',
      icon: 'inventory',
    });
  if (dashboard.productsCount !== undefined && cards.length < 4)
    cards.push({
      label: 'Produtos ativos',
      value: String(dashboard.productsCount),
      regime: 'Posição atual',
      href: '/produtos',
      icon: 'products',
    });
  const alerts = [
    ...(dashboard.lowStockCount
      ? [
          {
            label: `${dashboard.lowStockCount} ${dashboard.lowStockCount === 1 ? 'produto com estoque baixo' : 'produtos com estoque baixo'}`,
            href: '/estoque?state=low',
            icon: 'inventory' as IconName,
          },
        ]
      : []),
    ...(dashboard.overdueReceivablesCount
      ? [
          {
            label: `${dashboard.overdueReceivablesCount} ${dashboard.overdueReceivablesCount === 1 ? 'recebimento vencido' : 'recebimentos vencidos'}`,
            href: '/financeiro?tab=receivables',
            icon: 'sales' as IconName,
          },
        ]
      : []),
    ...(dashboard.overduePayablesCount
      ? [
          {
            label: `${dashboard.overduePayablesCount} ${dashboard.overduePayablesCount === 1 ? 'pagamento vencido' : 'pagamentos vencidos'}`,
            href: '/financeiro?tab=payables',
            icon: 'purchases' as IconName,
          },
        ]
      : []),
  ];
  return (
    <main className="page-content dashboard-page">
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">Visão geral</span>
          <h1>Olá, {session?.user.name.split(' ')[0]}</h1>
          <p>Veja o que aconteceu e o que precisa da sua atenção.</p>
        </div>
        <form className="dashboard-period" method="GET">
          <SelectControl
            name="period"
            defaultValue={period.key}
            aria-label="Período do dashboard"
          >
            <option value="month">Mês atual</option>
            <option value="last30">Últimos 30 dias</option>
            <option value="previous">Mês anterior</option>
            <option value="custom">Período personalizado</option>
          </SelectControl>
          <input
            aria-label="Data inicial"
            type="date"
            name="from"
            defaultValue={period.from}
          />
          <span>até</span>
          <input
            aria-label="Data final"
            type="date"
            name="to"
            defaultValue={period.to}
          />
          <button
            className="button button-secondary compact-button"
            type="submit"
          >
            Aplicar
          </button>
        </form>
      </div>
      <p className="dashboard-period-label">
        Dados de <strong>{civilDate(period.from)}</strong> até{' '}
        <strong>{civilDate(period.to)}</strong>. Comparação usa período anterior
        equivalente.
      </p>
      <section className="dashboard-kpis">
        {cards.map((card) => (
          <Link href={card.href} key={card.label}>
            <span className="dashboard-kpi-icon">
              <AppIcon name={card.icon} />
            </span>
            <div>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
              <em>{card.regime}</em>
              {card.change !== undefined && <Change value={card.change} />}
            </div>
            <AppIcon name="chevronRight" />
          </Link>
        ))}
      </section>
      {alerts.length > 0 && (
        <section className="dashboard-alerts">
          <div>
            <span>
              <AppIcon name="shield" />
            </span>
            <div>
              <strong>Itens que precisam de atenção</strong>
              <p>Resolva pendências antes que afetem a operação.</p>
            </div>
          </div>
          <nav>
            {alerts.map((alert) => (
              <Link key={alert.label} href={alert.href}>
                <AppIcon name={alert.icon} /> {alert.label}{' '}
                <AppIcon name="chevronRight" />
              </Link>
            ))}
          </nav>
        </section>
      )}
      {dashboard.salesTrend !== undefined && (
        <div className="dashboard-main-grid">
          <section className="data-card dashboard-sales-card">
            <div className="data-card-heading">
              <div>
                <h2>Vendas no período</h2>
                <p>
                  Faturamento por competência, considerando somente vendas
                  válidas.
                </p>
              </div>
              <Link className="text-link" href="/vendas">
                Ver vendas →
              </Link>
            </div>
            <SalesChart points={dashboard.salesTrend} />
          </section>
          <section className="data-card dashboard-top-products">
            <div className="data-card-heading">
              <div>
                <h2>Produtos mais vendidos</h2>
                <p>Quantidade líquida após devoluções.</p>
              </div>
              <Link className="text-link" href="/produtos">
                Ver produtos →
              </Link>
            </div>
            {dashboard.topProducts?.length ? (
              <ol>
                {dashboard.topProducts.map((product, index) => (
                  <li key={product.productId}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{product.name}</strong>
                      <small>{product.sku}</small>
                    </div>
                    <div>
                      <strong>{quantity(product.quantitySold)} un.</strong>
                      <small>{money(product.revenue)}</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="dashboard-inline-empty">
                <AppIcon name="products" />
                <p>Nenhum produto vendido no período.</p>
              </div>
            )}
          </section>
        </div>
      )}
      <section className="dashboard-summary-grid">
        {dashboard.productsCount !== undefined && (
          <Link className="dashboard-summary-card" href="/estoque">
            <div className="data-card-heading">
              <div>
                <h2>Estoque agora</h2>
                <p>Posição atual, independente do período.</p>
              </div>
              <AppIcon name="inventory" />
            </div>
            <dl>
              <div>
                <dt>Produtos ativos</dt>
                <dd>{dashboard.productsCount}</dd>
              </div>
              <div>
                <dt>Estoque baixo</dt>
                <dd>{dashboard.lowStockCount ?? 0}</dd>
              </div>
              {dashboard.inventoryValue !== undefined && (
                <div>
                  <dt>Valor em estoque</dt>
                  <dd>{money(dashboard.inventoryValue)}</dd>
                </div>
              )}
            </dl>
          </Link>
        )}
        {(dashboard.receivablesOpen !== undefined ||
          dashboard.payablesOpen !== undefined) && (
          <Link className="dashboard-summary-card" href="/financeiro">
            <div className="data-card-heading">
              <div>
                <h2>Compromissos financeiros</h2>
                <p>Valores previstos, ainda não realizados.</p>
              </div>
              <AppIcon name="finance" />
            </div>
            <dl>
              {dashboard.receivablesOpen !== undefined && (
                <div>
                  <dt>Contas a receber</dt>
                  <dd className="positive">
                    {money(dashboard.receivablesOpen)}
                  </dd>
                </div>
              )}
              {dashboard.payablesOpen !== undefined && (
                <div>
                  <dt>Contas a pagar</dt>
                  <dd>{money(dashboard.payablesOpen)}</dd>
                </div>
              )}
              {dashboard.expensesRealized !== undefined && (
                <div>
                  <dt>Despesas realizadas</dt>
                  <dd>{money(dashboard.expensesRealized)}</dd>
                </div>
              )}
            </dl>
          </Link>
        )}
        {dashboard.cmv !== undefined && (
          <Link className="dashboard-summary-card" href="/financeiro">
            <div className="data-card-heading">
              <div>
                <h2>Resultado do período</h2>
                <p>Visão gerencial por competência.</p>
              </div>
              <AppIcon name="sales" />
            </div>
            <dl>
              <div>
                <dt>Receita líquida</dt>
                <dd>{money(dashboard.revenueNet ?? '0')}</dd>
              </div>
              <div>
                <dt>CMV</dt>
                <dd>{money(dashboard.cmv)}</dd>
              </div>
              {dashboard.grossProfit !== undefined && (
                <div>
                  <dt>Lucro bruto</dt>
                  <dd>{money(dashboard.grossProfit)}</dd>
                </div>
              )}
              {dashboard.margin !== undefined && (
                <div>
                  <dt>Margem</dt>
                  <dd>
                    {dashboard.margin
                      ? `${Number(dashboard.margin).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
                      : '—'}
                  </dd>
                </div>
              )}
            </dl>
          </Link>
        )}
      </section>
      {dashboard.profitDistribution && (
        <section className="data-card dashboard-profit-distribution">
          <div className="data-card-heading">
            <div>
              <h2>Distribuição do lucro</h2>
              <p>
                {dashboard.profitDistribution.applied
                  ? `Projeção sobre ${money(dashboard.profitDistribution.baseAmount)} de resultado líquido positivo.`
                  : 'O período não possui resultado líquido positivo para distribuir.'}
              </p>
            </div>
            <Link className="text-link" href="/configuracoes?tab=company">
              Configurar política →
            </Link>
          </div>
          <dl>
            <div>
              <dt>
                Reinvestimento{' '}
                <small>{dashboard.profitDistribution.reinvestment.rate}%</small>
              </dt>
              <dd>{money(dashboard.profitDistribution.reinvestment.amount)}</dd>
            </div>
            <div>
              <dt>
                Pró-labore{' '}
                <small>{dashboard.profitDistribution.proLabore.rate}%</small>
              </dt>
              <dd>{money(dashboard.profitDistribution.proLabore.amount)}</dd>
            </div>
            <div>
              <dt>
                Reserva{' '}
                <small>{dashboard.profitDistribution.reserve.rate}%</small>
              </dt>
              <dd>{money(dashboard.profitDistribution.reserve.amount)}</dd>
            </div>
            <div>
              <dt>
                Marketing{' '}
                <small>{dashboard.profitDistribution.marketing.rate}%</small>
              </dt>
              <dd>{money(dashboard.profitDistribution.marketing.amount)}</dd>
            </div>
          </dl>
          <p className="dashboard-profit-note">
            Distribuição gerencial posterior ao lucro; não reduz o resultado
            operacional deste período.
          </p>
        </section>
      )}
    </main>
  );
}

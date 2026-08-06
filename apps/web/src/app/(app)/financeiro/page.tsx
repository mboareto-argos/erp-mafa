import Link from "next/link";
import { ExpenseForm } from "@/components/finance/expense-form";
import { ExpenseList, type ExpenseItem } from "@/components/finance/expense-list";
import { FinancialSetup } from "@/components/finance/financial-setup";
import { CashFlow, type Transaction } from "@/components/finance/cash-flow";
import { OpenItemForm } from "@/components/finance/open-item-form";
import { OpenItems, type OpenItem } from "@/components/finance/open-items";
import { AppIcon } from "@/components/layout/app-icon";
import { ListingEmptyState } from "@/components/listings/listing-ui";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Account = { id: string; name: string; status: string; balance?: string };
type Method = { id: string; name: string; type: string; status: string; financialAccountId: string | null; feeRate?: string | null; feeFixed?: string | null };
type Receivable = Omit<OpenItem, "amountApplied"> & { amountReceived: string };
type Payable = Omit<OpenItem, "amountApplied"> & { amountPaid: string };
type Tab = "overview" | "receivables" | "payables" | "expenses" | "cash" | "setup";

const money = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const hundred = BigInt(100);
const zero = BigInt(0);
const toCents = (value: string) => { const [whole = "0", fraction = ""] = value.split("."); return BigInt(whole || "0") * hundred + BigInt(`${fraction}00`.slice(0, 2)) * (whole.startsWith("-") ? BigInt(-1) : BigInt(1)); };
const fromCents = (value: bigint) => `${value < zero ? "-" : ""}${(value < zero ? -value : value) / hundred}.${String((value < zero ? -value : value) % hundred).padStart(2, "0")}`;
const sum = (values: string[]) => fromCents(values.reduce((total, value) => total + toCents(value), zero));
const remaining = (original: string, applied: string) => fromCents(toCents(original) - toCents(applied));

export default async function FinancialPage({ searchParams }: { searchParams: Promise<{ new?: string; tab?: string }> }) {
  const session = await getSession() as { permissions: string[] } | null;
  const has = (permission: string) => session?.permissions.includes(permission) ?? false;
  const query = await searchParams;
  const requestedTab = query.tab as Tab | undefined;
  const [rawAccounts, methods, expenses, receivables, payables, transactions] = await Promise.all([
    has("view_financial_accounts") ? backendAuthenticatedRequest("/financial-accounts") as Promise<Account[]> : Promise.resolve([]),
    has("view_payment_methods") ? backendAuthenticatedRequest("/payments/methods") as Promise<Method[]> : Promise.resolve([]),
    has("view_expenses") ? backendAuthenticatedRequest("/expenses") as Promise<ExpenseItem[]> : Promise.resolve([]),
    has("view_receivables") ? backendAuthenticatedRequest("/receivables") as Promise<Receivable[]> : Promise.resolve([]),
    has("view_payables") ? backendAuthenticatedRequest("/payables") as Promise<Payable[]> : Promise.resolve([]),
    has("view_cash_flow") ? backendAuthenticatedRequest("/cash-flow/transactions") as Promise<Transaction[]> : Promise.resolve([]),
  ]);
  const accounts = has("view_financial_accounts") ? await Promise.all(rawAccounts.map(async account => ({ ...account, ...(await backendAuthenticatedRequest(`/financial-accounts/${account.id}/balance`) as { balance: string }) }))) : [];
  const allTabs: Array<{ value: Tab; label: string; permission: boolean }> = [
    { value: "overview", label: "Visão geral", permission: has("view_expenses") || has("view_receivables") || has("view_payables") || has("view_cash_flow") },
    { value: "receivables", label: "A receber", permission: has("view_receivables") },
    { value: "payables", label: "A pagar", permission: has("view_payables") },
    { value: "expenses", label: "Despesas", permission: has("view_expenses") },
    { value: "cash", label: "Fluxo de caixa", permission: has("view_cash_flow") },
    { value: "setup", label: "Configurações", permission: has("view_financial_accounts") || has("view_payment_methods") },
  ];
  const tabs = allTabs.filter(tab => tab.permission);
  const tab = tabs.some(item => item.value === requestedTab) ? requestedTab! : tabs[0]?.value ?? "overview";
  const newAction = query.new;
  const receivableItems: OpenItem[] = receivables.map(item => ({ ...item, amountApplied: item.amountReceived }));
  const payableItems: OpenItem[] = payables.map(item => ({ ...item, amountApplied: item.amountPaid }));
  const openReceivables = receivableItems.filter(item => ["pending", "partially_received"].includes(item.status));
  const openPayables = payableItems.filter(item => ["pending", "partially_paid"].includes(item.status));
  const cashBalance = sum(accounts.map(account => account.balance ?? "0"));
  const receivableBalance = sum(openReceivables.map(item => remaining(item.amountOriginal, item.amountApplied)));
  const payableBalance = sum(openPayables.map(item => remaining(item.amountOriginal, item.amountApplied)));
  const overdueCount = [...openReceivables, ...openPayables].filter(item => item.isOverdue).length;
  const canSeeAnything = tabs.length > 0;

  return <main className="page-content finance-page">
    <div className="page-heading"><div><h1>Financeiro</h1><p>Entenda o que já aconteceu no caixa e o que ainda está previsto.</p></div>{!newAction && <div className="page-actions">{tab === "receivables" && has("manage_receivables") && <Link className="button button-primary compact-button" href="/financeiro?new=receivable"><AppIcon name="plus" /> Nova conta a receber</Link>}{tab === "payables" && has("manage_payables") && <Link className="button button-primary compact-button" href="/financeiro?new=payable"><AppIcon name="plus" /> Nova conta a pagar</Link>}{(tab === "expenses" || tab === "overview") && has("manage_expenses") && <Link className="button button-primary compact-button" href="/financeiro?new=expense"><AppIcon name="plus" /> Nova despesa</Link>}</div>}</div>

    {newAction === "expense" && has("manage_expenses") && <div className="page-workspace-action"><ExpenseForm accounts={accounts} initialOpen /></div>}
    {newAction === "receivable" && has("manage_receivables") && <div className="page-workspace-action"><OpenItemForm kind="receivables" initialOpen /></div>}
    {newAction === "payable" && has("manage_payables") && <div className="page-workspace-action"><OpenItemForm kind="payables" initialOpen /></div>}

    {!newAction && canSeeAnything && <nav className="finance-tabs" aria-label="Seções financeiras">{tabs.map(item => <Link key={item.value} href={`/financeiro?tab=${item.value}`} aria-current={tab === item.value ? "page" : undefined}>{item.label}</Link>)}</nav>}
    {!newAction && tab === "overview" && <>
      <section className="finance-kpis" aria-label="Resumo financeiro"><Link href="/financeiro?tab=cash"><span className="finance-kpi-icon cash"><AppIcon name="finance" /></span><div><small>Saldo em contas</small><strong>{money(cashBalance)}</strong><p>Caixa realizado</p></div></Link>{has("view_receivables") && <Link href="/financeiro?tab=receivables"><span className="finance-kpi-icon incoming"><AppIcon name="sales" /></span><div><small>A receber</small><strong>{money(receivableBalance)}</strong><p>Caixa previsto</p></div></Link>}{has("view_payables") && <Link href="/financeiro?tab=payables"><span className="finance-kpi-icon outgoing"><AppIcon name="purchases" /></span><div><small>A pagar</small><strong>{money(payableBalance)}</strong><p>Caixa previsto</p></div></Link>}<article><span className="finance-kpi-icon warning"><AppIcon name="shield" /></span><div><small>Títulos vencidos</small><strong>{overdueCount}</strong><p>Exigem atenção</p></div></article></section>
      <div className="finance-overview-grid"><section className="data-card"><div className="data-card-heading"><div><h2>Contas financeiras</h2><p>Saldo calculado pelas movimentações realizadas.</p></div><Link className="text-link" href="/financeiro?tab=cash">Ver fluxo</Link></div>{accounts.length === 0 ? <p className="inline-empty">Nenhuma conta financeira cadastrada.</p> : <div className="finance-overview-accounts">{accounts.map(account => <div key={account.id}><span><AppIcon name="finance" /></span><div><strong>{account.name}</strong><small>{account.status === "active" ? "Ativa" : "Inativa"}</small></div><b>{money(account.balance ?? "0")}</b></div>)}</div>}</section><section className="data-card"><div className="data-card-heading"><div><h2>Próximos compromissos</h2><p>Valores abertos ordenados por vencimento.</p></div></div>{[...openReceivables.map(item => ({ ...item, direction: "in" })), ...openPayables.map(item => ({ ...item, direction: "out" }))].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 6).map(item => <div className="finance-upcoming-item" key={`${item.direction}-${item.id}`}><span className={item.direction}><AppIcon name={item.direction === "in" ? "sales" : "purchases"} /></span><div><strong>{item.description}</strong><small>{item.isOverdue ? "Vencida" : `Vence em ${new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(item.dueDate))}`}</small></div><b>{item.direction === "in" ? "+" : "-"}{money(remaining(item.amountOriginal, item.amountApplied))}</b></div>)}</section></div>
    </>}
    {!newAction && tab === "receivables" && <OpenItems title="Contas a receber" kind="receivables" accounts={accounts} canManage={has("manage_receivables")} items={receivableItems} />}
    {!newAction && tab === "payables" && <OpenItems title="Contas a pagar" kind="payables" accounts={accounts} canManage={has("manage_payables")} items={payableItems} />}
    {!newAction && tab === "expenses" && <ExpenseList expenses={expenses} canManage={has("manage_expenses")} />}
    {!newAction && tab === "cash" && <CashFlow transactions={transactions} accounts={accounts} canTransfer={has("manage_financial_accounts")} />}
    {!newAction && tab === "setup" && <FinancialSetup accounts={accounts} methods={methods} canManageAccounts={has("manage_financial_accounts")} canManageMethods={has("manage_payment_methods")} />}
    {!newAction && !canSeeAnything && <ListingEmptyState title="Seu acesso financeiro é limitado" description="As informações financeiras aparecem conforme as permissões definidas para o seu perfil." />}
  </main>;
}

import { FinancialSetup } from "@/components/finance/financial-setup";
import { ExpenseForm } from "@/components/finance/expense-form";
import { OpenItems } from "@/components/finance/open-items";
import { OpenItemForm } from "@/components/finance/open-item-form";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";
type Account={id:string;name:string;status:string};type Method={id:string;name:string;status:string;financialAccountId:string|null};type Expense={id:string;description:string;amount:string;status:string;competenceDate:string};type Receivable={id:string;description:string;amountOriginal:string;amountReceived:string;dueDate:string;status:string};type Payable={id:string;description:string;amountOriginal:string;amountPaid:string;dueDate:string;status:string};
const money=(value:string)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(value));
export default async function FinancialPage(){
  const session=await getSession() as {permissions:string[]}|null;
  const has=(permission:string)=>session?.permissions.includes(permission)??false;
  const [accounts,methods,expenses,receivables,payables]=await Promise.all([
    backendAuthenticatedRequest("/financial-accounts") as Promise<Account[]>,
    backendAuthenticatedRequest("/payments/methods") as Promise<Method[]>,
    has("view_expenses")?backendAuthenticatedRequest("/expenses") as Promise<Expense[]>:Promise.resolve([]),
    has("view_receivables")?backendAuthenticatedRequest("/receivables") as Promise<Receivable[]>:Promise.resolve([]),
    has("view_payables")?backendAuthenticatedRequest("/payables") as Promise<Payable[]>:Promise.resolve([]),
  ]);
  const canManage=has("manage_financial_accounts")&&has("manage_payment_methods");
  return <main className="page-content"><div className="page-heading"><div><h1>Financeiro</h1><p>Organize seu caixa, despesas e contas futuras.</p></div><div className="page-actions">{has("manage_expenses")&&<ExpenseForm accounts={accounts}/>} {has("manage_receivables")&&<OpenItemForm kind="receivables"/>} {has("manage_payables")&&<OpenItemForm kind="payables"/>}</div></div><FinancialSetup accounts={accounts} methods={methods} canManage={canManage}/>{has("view_expenses")&&<section className="data-card finance-section"><h2 className="section-heading">Despesas recentes</h2>{expenses.length===0?<p className="inline-empty">Nenhuma despesa registrada.</p>:<div className="table-wrap"><table><thead><tr><th>Descrição</th><th>Status</th><th className="number">Valor</th></tr></thead><tbody>{expenses.slice(0,5).map(e=><tr key={e.id}><td data-label="Descrição"><strong>{e.description}</strong></td><td data-label="Status"><span className={`status-badge ${e.status}`}>{e.status==="paid"?"Paga":"Agendada"}</span></td><td data-label="Valor" className="number">{money(e.amount)}</td></tr>)}</tbody></table></div>}</section>}<div className="finance-open-grid">{has("view_receivables")&&<OpenItems title="Contas a receber" kind="receivables" accounts={accounts} canManage={has("manage_receivables")} items={receivables.map(item=>({...item,amountApplied:item.amountReceived}))}/>} {has("view_payables")&&<OpenItems title="Contas a pagar" kind="payables" accounts={accounts} canManage={has("manage_payables")} items={payables.map(item=>({...item,amountApplied:item.amountPaid}))}/>}</div></main>}

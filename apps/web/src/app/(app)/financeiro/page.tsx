import { ExpenseForm } from "@/components/finance/expense-form";
import { FinancialSetup } from "@/components/finance/financial-setup";
import { OpenItemForm } from "@/components/finance/open-item-form";
import { OpenItems } from "@/components/finance/open-items";
import { ListingEmptyState, ListingTable } from "@/components/listings/listing-ui";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Account = { id: string; name: string; status: string };
type Method = { id: string; name: string; status: string; financialAccountId: string | null };
type Expense = { id: string; description: string; amount: string; status: string; competenceDate: string };
type Receivable = { id: string; description: string; amountOriginal: string; amountReceived: string; dueDate: string; status: string; isOverdue?: boolean };
type Payable = { id: string; description: string; amountOriginal: string; amountPaid: string; dueDate: string; status: string; isOverdue?: boolean };

const money = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const expenseStatus = (status: string) => status === "paid" ? "Paga" : status === "cancelled" ? "Cancelada" : "Agendada";

export default async function FinancialPage() {
  const session = await getSession() as { permissions: string[] } | null;
  const has = (permission: string) => session?.permissions.includes(permission) ?? false;
  const [accounts, methods, expenses, receivables, payables] = await Promise.all([
    backendAuthenticatedRequest("/financial-accounts") as Promise<Account[]>,
    backendAuthenticatedRequest("/payments/methods") as Promise<Method[]>,
    has("view_expenses") ? backendAuthenticatedRequest("/expenses") as Promise<Expense[]> : Promise.resolve([]),
    has("view_receivables") ? backendAuthenticatedRequest("/receivables") as Promise<Receivable[]> : Promise.resolve([]),
    has("view_payables") ? backendAuthenticatedRequest("/payables") as Promise<Payable[]> : Promise.resolve([]),
  ]);
  const canManageSetup = has("manage_financial_accounts") && has("manage_payment_methods");
  const canSeeFinancialData = has("view_expenses") || has("view_receivables") || has("view_payables");

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h1>Financeiro</h1>
          <p>Organize seu caixa, despesas e contas futuras.</p>
        </div>
        <div className="page-actions">
          {has("manage_expenses") && <ExpenseForm accounts={accounts} />}
          {has("manage_receivables") && <OpenItemForm kind="receivables" />}
          {has("manage_payables") && <OpenItemForm kind="payables" />}
        </div>
      </div>

      <FinancialSetup accounts={accounts} methods={methods} canManage={canManageSetup} />

      {!canSeeFinancialData && !canManageSetup && (
        <ListingEmptyState
          title="Seu acesso financeiro é limitado"
          description="As informações financeiras aparecem aqui conforme as permissões definidas para o seu perfil."
        />
      )}

      {has("view_expenses") && (
        <section className="finance-section">
          <h2 className="mb-3 text-xl">Despesas recentes</h2>
          {expenses.length === 0 ? (
            <ListingEmptyState
              title="Nenhuma despesa registrada"
              description="Registre uma despesa para acompanhar o dinheiro que saiu da operação."
            />
          ) : (
            <ListingTable headers={<><th>Descrição</th><th>Status</th><th className="number">Valor</th></>}>
              {expenses.slice(0, 5).map((expense) => (
                <tr key={expense.id}>
                  <td data-label="Descrição"><strong>{expense.description}</strong></td>
                  <td data-label="Status"><span className={`status-badge ${expense.status}`}>{expenseStatus(expense.status)}</span></td>
                  <td data-label="Valor" className="number">{money(expense.amount)}</td>
                </tr>
              ))}
            </ListingTable>
          )}
        </section>
      )}

      <div className="finance-open-grid">
        {has("view_receivables") && <OpenItems title="Contas a receber" kind="receivables" accounts={accounts} canManage={has("manage_receivables")} items={receivables.map((item) => ({ ...item, amountApplied: item.amountReceived }))} />}
        {has("view_payables") && <OpenItems title="Contas a pagar" kind="payables" accounts={accounts} canManage={has("manage_payables")} items={payables.map((item) => ({ ...item, amountApplied: item.amountPaid }))} />}
      </div>
    </main>
  );
}

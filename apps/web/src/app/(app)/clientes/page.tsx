import { CustomerDirectory, type CustomerListItem } from "@/components/customers/customer-directory";
import { AppIcon } from "@/components/layout/app-icon";
import { ListingMetrics, ListingPagination, ListingSearch } from "@/components/listings/listing-ui";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type PaginatedCustomers = { items: CustomerListItem[]; total: number; page: number; pageSize: number };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; new?: string }>;
}) {
  const { q, page, new: newAction } = await searchParams;
  const currentPage = Number(page ?? "1") || 1;
  const query = new URLSearchParams({ page: String(currentPage) });
  if (q) query.set("q", q);

  const [customers, session] = await Promise.all([
    backendAuthenticatedRequest(`/customers?${query.toString()}`) as Promise<PaginatedCustomers>,
    getSession() as Promise<{ permissions: string[] } | null>,
  ]);
  const canManage = session?.permissions.includes("manage_customers") ?? false;

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h1>Clientes</h1>
          <p>Histórico e relacionamento em um único lugar.</p>
        </div>
      </div>

      {canManage && <div className="page-workspace-action"><a className="button button-primary compact-button" href="?new=customer"><AppIcon name="plus" />Novo cliente</a></div>}

      <ListingMetrics metrics={[{ label: "Clientes cadastrados", value: customers.total, detail: "Na empresa atual", icon: "customers" }, { label: "Ativos nesta página", value: customers.items.filter(customer => customer.status === "active").length, detail: "Disponíveis para venda", icon: "customers" }, { label: "Resultados exibidos", value: customers.items.length, detail: q ? "Para a busca atual" : "Na página atual", icon: "search" }]} />

      <ListingSearch id="customer-search" label="Buscar por nome" query={q} placeholder="Ex.: Ana" />

      <CustomerDirectory customers={customers.items} canManage={canManage} initialOpen={newAction === "customer"} query={q} />

      <ListingPagination page={customers.page} total={customers.total} pageSize={customers.pageSize} query={q} />
    </main>
  );
}

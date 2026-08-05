import { ContactDirectory } from "@/components/contacts/contact-directory";
import { ListingPagination, ListingSearch } from "@/components/listings/listing-ui";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Customer = { id: string; name: string; email: string | null; phone: string | null; whatsapp: string | null; instagram: string | null; birthDate: string | null; status: "active" | "inactive" };
type PaginatedCustomers = { items: Customer[]; total: number; page: number; pageSize: number };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
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

      <ListingSearch id="customer-search" label="Buscar por nome" query={q} placeholder="Ex.: Ana" />

      <ContactDirectory kind="cliente" contacts={customers.items} canManage={canManage} />

      <ListingPagination page={customers.page} total={customers.total} pageSize={customers.pageSize} query={q} />
    </main>
  );
}

import { ContactDirectory } from "@/components/contacts/contact-directory";
import { ListingPagination, ListingSearch } from "@/components/listings/listing-ui";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type Supplier = { id: string; name: string; email: string | null; phone: string | null; whatsapp: string |null; document: string | null; contactName: string | null; status: "active" | "inactive" };
type PaginatedSuppliers = { items: Supplier[]; total: number; page: number; pageSize: number };

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Number(page ?? "1") || 1;
  const query = new URLSearchParams({ page: String(currentPage) });
  if (q) query.set("q", q);

  const [suppliers, session] = await Promise.all([
    backendAuthenticatedRequest(`/purchasing/suppliers?${query.toString()}`) as Promise<PaginatedSuppliers>,
    getSession() as Promise<{ permissions: string[] } | null>,
  ]);
  const canManage = session?.permissions.includes("manage_purchasing") ?? false;

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h1>Fornecedores</h1>
          <p>Organize quem fornece suas mercadorias.</p>
        </div>
      </div>

      <ListingSearch id="supplier-search" label="Buscar por nome" query={q} placeholder="Ex.: distribuidora" />

      <ContactDirectory kind="fornecedor" contacts={suppliers.items} canManage={canManage} />

      <ListingPagination page={suppliers.page} total={suppliers.total} pageSize={suppliers.pageSize} query={q} />
    </main>
  );
}

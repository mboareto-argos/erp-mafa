import { AppIcon } from "@/components/layout/app-icon";
import { SupplierDirectory, type SupplierListItem } from "@/components/suppliers/supplier-directory";
import { ListingMetrics, ListingPagination, ListingSearch } from "@/components/listings/listing-ui";
import { backendAuthenticatedRequest, getSession } from "@/lib/session";

type PaginatedSuppliers = { items: SupplierListItem[]; total: number; page: number; pageSize: number };

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; new?: string }>;
}) {
  const { q, page, new: newAction } = await searchParams;
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

      {canManage && <div className="page-workspace-action"><a className="button button-primary compact-button" href="?new=supplier"><AppIcon name="plus" />Novo fornecedor</a></div>}

      <ListingMetrics metrics={[{ label: "Fornecedores cadastrados", value: suppliers.total, detail: "Na empresa atual", icon: "suppliers" }, { label: "Ativos nesta página", value: suppliers.items.filter(supplier => supplier.status === "active").length, detail: "Disponíveis para compras", icon: "suppliers" }, { label: "Resultados exibidos", value: suppliers.items.length, detail: q ? "Para a busca atual" : "Na página atual", icon: "search" }]} />

      <ListingSearch id="supplier-search" label="Buscar por nome" query={q} placeholder="Ex.: distribuidora" />

      <SupplierDirectory suppliers={suppliers.items} canManage={canManage} initialOpen={newAction === "supplier"} query={q} />

      <ListingPagination page={suppliers.page} total={suppliers.total} pageSize={suppliers.pageSize} query={q} />
    </main>
  );
}

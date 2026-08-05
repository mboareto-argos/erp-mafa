import { ListingSkeleton } from "@/components/listings/listing-ui";

export default function DashboardLoading() {
  return (
    <main className="page-content" aria-busy="true">
      <div className="page-heading"><div><h1>Início</h1><p>Preparando o resumo da operação…</p></div></div>
      <ListingSkeleton />
    </main>
  );
}

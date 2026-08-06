import { ListingSkeleton } from "@/components/listings/listing-ui";

export default function ImportsLoading() {
  return <main className="page-content" aria-busy="true"><div className="page-heading"><div><h1>Importações</h1><p>Carregando o histórico de migração…</p></div></div><ListingSkeleton /></main>;
}

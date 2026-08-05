import { ListingSkeleton } from "@/components/listings/listing-ui";

export default function PurchasesLoading() {
  return <main className="page-content" aria-busy="true"><div className="page-heading"><div><h1>Compras</h1><p>Carregando compras e produtos…</p></div></div><ListingSkeleton /></main>;
}

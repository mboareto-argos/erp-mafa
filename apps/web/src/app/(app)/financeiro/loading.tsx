import { ListingSkeleton } from '@/components/listings/listing-ui';

export default function FinancialLoading() {
  return (
    <main className="page-content" aria-busy="true">
      <div className="page-heading">
        <div>
          <h1>Financeiro</h1>
          <p>Carregando dados financeiros…</p>
        </div>
      </div>
      <ListingSkeleton />
      <ListingSkeleton />
    </main>
  );
}

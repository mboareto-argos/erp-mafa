import { ListingSkeleton } from '@/components/listings/listing-ui';

export default function SalesLoading() {
  return (
    <main className="page-content" aria-busy="true">
      <div className="page-heading">
        <div>
          <h1>Vendas</h1>
          <p>Carregando vendas e formas de pagamento…</p>
        </div>
      </div>
      <ListingSkeleton />
    </main>
  );
}

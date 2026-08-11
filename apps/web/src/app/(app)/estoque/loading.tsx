import { ListingSkeleton } from '@/components/listings/listing-ui';

export default function InventoryLoading() {
  return (
    <main className="page-content" aria-busy="true">
      <div className="page-heading">
        <div>
          <h1>Estoque</h1>
          <p>Carregando seus produtos…</p>
        </div>
      </div>
      <ListingSkeleton />
    </main>
  );
}

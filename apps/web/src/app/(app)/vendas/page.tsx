import { AppIcon } from '@/components/layout/app-icon';
import {
  ListingMetrics,
  ListingPagination,
} from '@/components/listings/listing-ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  SaleActions,
  type SaleListItem,
} from '@/components/sales/sale-actions';
import { backendAuthenticatedRequest, getSession } from '@/lib/session';

type SalesPage = {
  items: SaleListItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: { confirmedCount: number; confirmedTotal: string };
};
const PAGE_SIZE = 20;
type Method = { id: string; name: string; status: string };

const money = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
const saleStatus: Record<string, string> = {
  draft: 'Rascunho',
  reserved: 'Reservada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  partially_returned: 'Devolvida parcialmente',
  returned: 'Devolvida',
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string; page?: string }>;
}) {
  // Links antigos (?new=sale, ?edit=ID) levam para a Nova venda em tela cheia.
  const { new: newAction, edit: editId, page } = await searchParams;
  const currentPage = Math.max(Number(page ?? '1') || 1, 1);
  if (editId) redirect(`/vendas/nova?rascunho=${editId}`);
  if (newAction === 'sale') redirect('/vendas/nova');

  // Uma página por vez; os números do topo vêm calculados da API sobre o
  // histórico inteiro. Do catálogo só interessa saber se existe produto.
  const [result, catalog, methods, session] = await Promise.all([
    backendAuthenticatedRequest(
      `/sales?page=${currentPage}&pageSize=${PAGE_SIZE}`,
    ) as Promise<SalesPage>,
    backendAuthenticatedRequest(
      '/catalog/products?page=1&pageSize=1',
    ) as Promise<{ total: number }>,
    backendAuthenticatedRequest('/payments/methods') as Promise<Method[]>,
    getSession() as Promise<{
      permissions: string[];
      company?: { name: string };
    } | null>,
  ]);
  const canManage = session?.permissions.includes('manage_sales') ?? false;
  const sales = result.items;
  const hasProducts = catalog.total > 0;

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h1>Vendas</h1>
          <p>
            Uma venda atualiza estoque, CMV e pagamento em uma única operação.
          </p>
        </div>
      </div>
      {canManage && hasProducts && (
        <div className="page-workspace-action">
          <Link
            className="button button-primary compact-button"
            href="/vendas/nova"
          >
            Nova venda
          </Link>
        </div>
      )}
      <ListingMetrics
        metrics={[
          {
            label: 'Vendas cadastradas',
            value: result.total,
            detail: 'No histórico disponível',
            icon: 'sales',
          },
          {
            label: 'Confirmadas',
            value: result.summary.confirmedCount,
            detail: 'Com estoque e pagamento atualizados',
            icon: 'sales',
          },
          {
            label: 'Valor confirmado',
            value: money(result.summary.confirmedTotal),
            detail: 'No histórico disponível',
            icon: 'finance',
          },
        ]}
      />
      <section className="data-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Venda</th>
                <th>Cliente</th>
                <th>Status</th>
                <th className="number">Itens</th>
                <th className="number">Total</th>
                <th className="table-actions-column">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr className="table-empty-row">
                  <td className="table-empty-cell" colSpan={6}>
                    <div className="table-empty-content">
                      <span>
                        <AppIcon name="sales" />
                      </span>
                      <strong>
                        {!hasProducts
                          ? 'Cadastre um produto antes de fazer uma venda'
                          : 'Nenhuma venda registrada ainda'}
                      </strong>
                      <p>
                        {!hasProducts
                          ? 'O produto é necessário para validar a disponibilidade e preservar o custo histórico.'
                          : 'Quando uma venda for criada, ela aparecerá nesta listagem.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td data-label="Venda">
                      <strong>Venda #{sale.id.slice(0, 8)}</strong>
                      <span className="table-detail">
                        {dateTime(sale.createdAt)}
                      </span>
                    </td>
                    <td data-label="Cliente">
                      <strong>
                        {sale.customer?.name ?? 'Consumidor final'}
                      </strong>
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge ${sale.status}`}>
                        {saleStatus[sale.status] ?? sale.status}
                      </span>
                    </td>
                    <td className="number" data-label="Itens">
                      {sale.items.length}
                    </td>
                    <td className="number" data-label="Total">
                      {money(sale.total)}
                    </td>
                    <td className="table-actions-cell" data-label="Ações">
                      <SaleActions
                        sale={sale}
                        canManage={canManage}
                        methods={methods}
                        storeName={session?.company?.name ?? ''}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <ListingPagination
        page={result.page}
        total={result.total}
        pageSize={result.pageSize}
      />
    </main>
  );
}

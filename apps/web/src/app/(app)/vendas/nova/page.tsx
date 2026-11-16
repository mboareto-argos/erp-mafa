import { redirect } from 'next/navigation';
import { NewSaleFlow } from '@/components/sales/new-sale/new-sale-flow';
import type {
  CatalogProduct,
  PaymentMethod,
} from '@/components/sales/new-sale/sale-math';
import { backendAuthenticatedRequest, getSession } from '@/lib/session';

type Customer = {
  id: string;
  name: string;
  status: string;
  whatsapp?: string | null;
};
type Balance = { productVariantId: string; quantityAvailable: string };
type Account = { id: string; name: string };
type DraftSale = {
  id: string;
  status: string;
  channel: string;
  discount: string;
  customer?: { id: string } | null;
  customerId?: string | null;
  items: { productVariantId: string; quantity: string; unitPrice: string }[];
};

// Dados opcionais (estoque, contas) dependem de permissões que nem todo
// perfil tem; sem permissão a tela continua funcionando, só sem a dica.
const optional = <T,>(request: Promise<unknown>, fallback: T) =>
  (request as Promise<T>).catch(() => fallback);

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ rascunho?: string; adicionar?: string }>;
}) {
  const session = (await getSession()) as { permissions: string[] } | null;
  const permissions = session?.permissions ?? [];
  // Tela inteira só existe para quem pode vender (DS-PERM-001); o backend
  // valida de novo em cada chamada (TA-SEC-001).
  if (!permissions.includes('manage_sales')) redirect('/vendas');

  const { rascunho, adicionar } = await searchParams;
  const [products, methods, customers, balances, accounts, draft] =
    await Promise.all([
      backendAuthenticatedRequest('/catalog/products') as Promise<
        CatalogProduct[]
      >,
      backendAuthenticatedRequest('/payments/methods') as Promise<
        PaymentMethod[]
      >,
      backendAuthenticatedRequest('/customers') as Promise<Customer[]>,
      optional<Balance[]>(
        backendAuthenticatedRequest('/inventory/balances'),
        [],
      ),
      optional<Account[]>(
        backendAuthenticatedRequest('/financial-accounts'),
        [],
      ),
      rascunho
        ? optional<DraftSale | null>(
            backendAuthenticatedRequest(`/sales/${rascunho}`),
            null,
          )
        : Promise.resolve(null),
    ]);

  const stock = Object.fromEntries(
    balances.map((balance) => [
      balance.productVariantId,
      Number(balance.quantityAvailable),
    ]),
  );
  const editableDraft = draft && draft.status === 'draft' ? draft : null;

  return (
    <NewSaleFlow
      products={products}
      methods={methods.filter((method) => method.status === 'active')}
      customers={customers.filter((customer) => customer.status === 'active')}
      stock={balances.length > 0 ? stock : null}
      accounts={Object.fromEntries(
        accounts.map((account) => [account.id, account.name]),
      )}
      canCreateCustomer={permissions.includes('manage_customers')}
      canManageCatalog={permissions.includes('manage_catalog')}
      initialAdd={adicionar}
      draft={
        editableDraft
          ? {
              id: editableDraft.id,
              channel: editableDraft.channel,
              discount: editableDraft.discount,
              customerId:
                editableDraft.customer?.id ?? editableDraft.customerId ?? '',
              items: editableDraft.items,
            }
          : null
      }
    />
  );
}

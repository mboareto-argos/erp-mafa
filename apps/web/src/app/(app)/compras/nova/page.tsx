import { redirect } from 'next/navigation';
import { NewPurchaseFlow } from '@/components/purchasing/new-purchase/new-purchase-flow';
import type { CatalogProduct } from '@/lib/catalog';
import { backendAuthenticatedRequest, getSession } from '@/lib/session';

type Supplier = {
  id: string;
  name: string;
  status: string;
  whatsapp?: string | null;
};
type Account = { id: string; name: string; status?: string };
type DraftPurchase = {
  id: string;
  status: string;
  supplierId?: string | null;
  items: {
    productVariantId: string;
    quantity: string;
    unitCostOriginCurrency: string;
  }[];
};

const optional = <T,>(request: Promise<unknown>, fallback: T) =>
  (request as Promise<T>).catch(() => fallback);

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ rascunho?: string }>;
}) {
  const session = (await getSession()) as { permissions: string[] } | null;
  const permissions = session?.permissions ?? [];
  // Sem permissão de compras a tela não existe (DS-PERM-001); a API valida
  // de novo cada chamada (TA-SEC-001).
  if (!permissions.includes('manage_purchasing')) redirect('/compras');
  const canPay = permissions.includes('manage_payables');

  const { rascunho } = await searchParams;
  const [products, suppliers, accounts, draft] = await Promise.all([
    backendAuthenticatedRequest('/catalog/products') as Promise<
      CatalogProduct[]
    >,
    backendAuthenticatedRequest('/purchasing/suppliers') as Promise<Supplier[]>,
    canPay
      ? optional<Account[]>(
          backendAuthenticatedRequest('/financial-accounts'),
          [],
        )
      : Promise.resolve([] as Account[]),
    rascunho
      ? optional<DraftPurchase | null>(
          backendAuthenticatedRequest(`/purchasing/purchases/${rascunho}`),
          null,
        )
      : Promise.resolve(null),
  ]);
  const editableDraft = draft && draft.status === 'draft' ? draft : null;

  return (
    <NewPurchaseFlow
      products={products}
      suppliers={suppliers.filter((supplier) => supplier.status === 'active')}
      accounts={accounts
        .filter((account) => !account.status || account.status === 'active')
        .map(({ id, name }) => ({ id, name }))}
      canCreateProduct={permissions.includes('manage_catalog')}
      canCreateSupplier={permissions.includes('manage_purchasing')}
      canPay={canPay}
      draft={
        editableDraft
          ? {
              id: editableDraft.id,
              supplierId: editableDraft.supplierId ?? '',
              items: editableDraft.items,
            }
          : null
      }
    />
  );
}

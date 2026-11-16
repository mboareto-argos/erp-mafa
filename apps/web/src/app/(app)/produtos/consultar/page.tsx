import { redirect } from 'next/navigation';
import { ProductLookup } from '@/components/scanner/product-lookup';
import type { CatalogProduct } from '@/lib/catalog';
import { backendAuthenticatedRequest, getSession } from '@/lib/session';

export default async function ProductLookupPage() {
  const session = (await getSession()) as { permissions: string[] } | null;
  const permissions = session?.permissions ?? [];
  if (!permissions.includes('view_catalog')) redirect('/inicio');
  const products = (await backendAuthenticatedRequest(
    '/catalog/products',
  )) as CatalogProduct[];
  return (
    <ProductLookup
      products={products}
      canManageCatalog={permissions.includes('manage_catalog')}
    />
  );
}

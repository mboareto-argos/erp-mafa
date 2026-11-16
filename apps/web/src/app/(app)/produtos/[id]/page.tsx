import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ChevronLeft,
  Package,
  Pencil,
  ScanBarcode,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCents, toCents } from '@/lib/money';
import {
  ApiRequestError,
  backendAuthenticatedRequest,
  getSession,
} from '@/lib/session';
import { cn } from '@/lib/utils';

type ProductDetail = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  status: string;
  minStock?: string | null;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  variants: { id: string; skuVariant: string; barcode?: string | null }[];
  prices: { salePrice: string; effectiveFrom: string }[];
};
type Balance = {
  productVariantId: string;
  quantityAvailable: string;
  quantityInTransit?: string;
};

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));

// Página do produto, no espírito de uma vitrine: preço e estoque em destaque
// e as ações do dia a dia (vender, comprar mais). É para onde a consulta por
// código de barras leva.
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = (await getSession()) as { permissions: string[] } | null;
  const permissions = session?.permissions ?? [];
  if (!permissions.includes('view_catalog')) redirect('/inicio');
  const can = (permission: string) => permissions.includes(permission);

  const { id } = await params;
  const [product, balances] = await Promise.all([
    (
      backendAuthenticatedRequest(
        `/catalog/products/${id}`,
      ) as Promise<ProductDetail>
    ).catch((error: unknown) => {
      if (
        error instanceof ApiRequestError &&
        (error.status === 404 || error.status === 400)
      )
        notFound();
      throw error;
    }),
    can('view_inventory')
      ? (
          backendAuthenticatedRequest('/inventory/balances') as Promise<
            Balance[]
          >
        ).catch(() => [] as Balance[])
      : Promise.resolve(null),
  ]);

  const variant = product.variants[0];
  const balance = balances?.find(
    (item) => item.productVariantId === variant?.id,
  );
  const available = balance
    ? Number(balance.quantityAvailable)
    : balances
      ? 0
      : null;
  const inTransit = balance ? Number(balance.quantityInTransit ?? 0) : 0;
  const price = product.prices[0];
  const active = product.status === 'active';

  return (
    <main className="page-content grid max-w-4xl gap-5">
      <Link
        href="/produtos"
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Produtos
      </Link>

      <article className="grid gap-6 rounded-lg border border-neutral-100 bg-neutral-0 p-4 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)] sm:p-6">
        {/* Foto do produto entra aqui na próxima etapa (Vercel Blob). */}
        <div
          className="grid aspect-[2/1] place-items-center rounded-lg bg-neutral-50 text-neutral-300 sm:aspect-square"
          aria-hidden="true"
        >
          <Package className="size-16" strokeWidth={1.2} />
        </div>

        <div className="grid content-start gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-accent-hover uppercase">
              {[product.brand?.name, product.category?.name]
                .filter(Boolean)
                .join(' · ') || 'Produto'}
            </p>
            <h1 className="text-2xl font-semibold text-neutral-900">
              {product.name}
            </h1>
            {!active && (
              <span className="mt-2 inline-block rounded-sm bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700">
                Inativo — não aparece em vendas e compras
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <span className="block text-xs text-neutral-500">
                Preço de venda
              </span>
              <strong className="text-display font-bold text-neutral-900 tabular-nums">
                {price ? formatCents(toCents(price.salePrice)) : 'Sem preço'}
              </strong>
              {price && (
                <span className="block text-xs text-neutral-500">
                  desde {dateLabel(price.effectiveFrom)}
                </span>
              )}
            </div>
            {available !== null && (
              <div>
                <span
                  className={cn(
                    'inline-block rounded-sm px-2 py-1 text-sm font-semibold',
                    available <= 0
                      ? 'bg-danger-50 text-danger-600'
                      : 'bg-success-50 text-success-600',
                  )}
                >
                  {available <= 0 ? 'Sem estoque' : `${available} em estoque`}
                </span>
                {inTransit > 0 && (
                  <span className="mt-1 block text-xs text-info-600">
                    +{inTransit} a caminho
                  </span>
                )}
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-md bg-neutral-25 p-3 text-sm">
            <div>
              <dt className="text-xs text-neutral-500">Código de barras</dt>
              <dd className="font-mono text-neutral-900">
                {variant?.barcode ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Código interno (SKU)</dt>
              <dd className="font-mono text-neutral-900">{product.sku}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Unidade</dt>
              <dd className="text-neutral-900">{product.unit}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Estoque mínimo</dt>
              <dd className="text-neutral-900">
                {product.minStock ? Number(product.minStock) : '—'}
              </dd>
            </div>
          </dl>

          <div className="grid gap-2 sm:flex sm:flex-wrap">
            {active && can('manage_sales') && variant && (
              <Button asChild size="lg">
                <Link href={`/vendas/nova?adicionar=${variant.id}`}>
                  <ShoppingCart aria-hidden="true" />
                  Adicionar a uma venda
                </Link>
              </Button>
            )}
            {active && can('manage_purchasing') && variant && (
              <Button asChild size="lg" variant="secondary">
                <Link href={`/compras/nova?adicionar=${variant.id}`}>
                  <ShoppingBag aria-hidden="true" />
                  Comprar mais
                </Link>
              </Button>
            )}
            {can('manage_catalog') && (
              <Button asChild size="lg" variant="tertiary">
                <Link href={`/produtos?edit=${product.id}`}>
                  <Pencil aria-hidden="true" />
                  Editar cadastro
                </Link>
              </Button>
            )}
          </div>
        </div>
      </article>

      <Button asChild variant="secondary" className="justify-self-start">
        <Link href="/produtos/consultar">
          <ScanBarcode aria-hidden="true" />
          Consultar outro produto
        </Link>
      </Button>
    </main>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { Link2, PackagePlus, ScanBarcode } from 'lucide-react';
import { QuickProductForm } from '@/components/catalog/quick-product-form';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  primaryBarcode,
  searchProducts,
  type CatalogProduct,
} from '@/lib/catalog';

type Mode = 'choose' | 'link' | 'create';

/**
 * Código lido que nenhum produto tem. É assim que o catálogo antigo (sem
 * códigos) ganha os códigos de barras aos poucos: na primeira vez que um
 * frasco é bipado, diz-se qual produto ele é e o código fica gravado nele.
 * Ou cadastra-se o produto novo ali mesmo.
 */
export function UnknownCodeSheet({
  code,
  products,
  canManageCatalog,
  onOpenChange,
  onResolved,
}: {
  /** Código lido; null fecha a gaveta. */
  code: string | null;
  products: CatalogProduct[];
  canManageCatalog: boolean;
  onOpenChange: (open: boolean) => void;
  /** Produto que agora tem esse código (vinculado ou recém-cadastrado). */
  onResolved: (product: CatalogProduct, how: 'linked' | 'created') => void;
}) {
  const [mode, setMode] = useState<Mode>('choose');
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState<string>();
  const [current, setCurrent] = useState<string | null>(null);

  if (code !== current) {
    setCurrent(code);
    setMode('choose');
    setQuery('');
    setError(undefined);
  }

  const results = useMemo(
    () => searchProducts(products, query).slice(0, 20),
    [products, query],
  );

  async function link(product: CatalogProduct) {
    if (!code) return;
    setPendingId(product.id);
    setError(undefined);
    try {
      const response = await fetch(`/api/catalog/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code }),
      });
      const body = (await response
        .json()
        .catch(() => ({}))) as CatalogProduct & { message?: string };
      if (!response.ok)
        throw new Error(body.message ?? 'Não foi possível vincular o código.');
      onResolved(
        {
          ...product,
          variants: product.variants.map((variant, index) =>
            index === 0 ? { ...variant, barcode: code } : variant,
          ),
        },
        'linked',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível vincular o código.',
      );
    } finally {
      setPendingId(undefined);
    }
  }

  return (
    <Drawer open={code !== null} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <div className="grid gap-4 overflow-y-auto px-4 pb-4">
          <DrawerHeader className="px-0">
            <DrawerTitle className="flex items-center gap-2">
              <ScanBarcode
                className="size-5 text-brand-accent-hover"
                aria-hidden="true"
              />
              Código não encontrado
            </DrawerTitle>
            <DrawerDescription>
              Nenhum produto tem o código{' '}
              <strong className="font-mono text-neutral-900">{code}</strong>.
            </DrawerDescription>
          </DrawerHeader>

          {!canManageCatalog && (
            <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
              Peça para quem cuida do catálogo cadastrar este código, ou busque
              o produto pelo nome.
            </p>
          )}

          {canManageCatalog && mode === 'choose' && (
            <div className="grid gap-2">
              <Button type="button" size="lg" onClick={() => setMode('link')}>
                <Link2 aria-hidden="true" />É um produto que já tenho
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={() => setMode('create')}
              >
                <PackagePlus aria-hidden="true" />
                Cadastrar produto novo
              </Button>
              <p className="text-xs text-neutral-500">
                Vinculando, o código fica salvo no produto e da próxima vez ele
                aparece direto.
              </p>
            </div>
          )}

          {canManageCatalog && mode === 'link' && (
            <div className="grid gap-2">
              <label
                className="text-sm font-semibold text-neutral-700"
                htmlFor="link-search"
              >
                Qual produto é este?
              </label>
              <input
                id="link-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar pelo nome"
                autoComplete="off"
                autoFocus
                className="h-12 rounded-md border border-neutral-200 px-3 text-md text-neutral-900 focus:border-brand-accent focus:outline-none"
              />
              <ul
                className="grid max-h-72 gap-1 overflow-y-auto"
                aria-label="Produtos para vincular"
              >
                {results.map((product) => {
                  const existing = primaryBarcode(product);
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        disabled={Boolean(pendingId)}
                        onClick={() => link(product)}
                        className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-brand-accent disabled:opacity-50"
                      >
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm font-semibold text-neutral-900">
                            {product.name}
                          </strong>
                          <span className="block text-xs text-neutral-500">
                            {product.sku}
                            {existing
                              ? ` · substitui o código ${existing}`
                              : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-brand-accent-hover">
                          {pendingId === product.id
                            ? 'Vinculando…'
                            : 'Vincular'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => setMode('choose')}
              >
                Voltar
              </Button>
            </div>
          )}

          {canManageCatalog && mode === 'create' && code && (
            <QuickProductForm
              initialBarcode={code}
              submitLabel="Cadastrar"
              onCancel={() => setMode('choose')}
              onCreated={(product) => onResolved(product, 'created')}
            />
          )}

          {error && (
            <p
              role="alert"
              className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
            >
              {error}
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

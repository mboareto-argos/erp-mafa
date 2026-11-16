'use client';

import { ProductImage } from '@/components/catalog/product-image';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findByCode, searchProducts, type CatalogProduct } from '@/lib/catalog';
import { formatCents, toCents } from '@/lib/money';
import { BarcodeScanner } from './barcode-scanner';
import { ScanSearchField } from './scan-search-field';
import { UnknownCodeSheet } from './unknown-code-sheet';

/**
 * Consulta rápida: abre a câmera, bipa e vai direto para a página do
 * produto (preço, estoque, "Adicionar a uma venda"). Também busca por nome.
 */
export function ProductLookup({
  products: initialProducts,
  canManageCatalog,
}: {
  products: CatalogProduct[];
  canManageCatalog: boolean;
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [scannerOpen, setScannerOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const results = useMemo(
    () => (query.trim() ? searchProducts(products, query).slice(0, 20) : []),
    [products, query],
  );

  function open(code: string) {
    setScannerOpen(false);
    const product = findByCode(products, code);
    if (product) router.push(`/produtos/${product.id}`);
    else setUnknownCode(code);
  }

  return (
    <main className="page-content grid max-w-2xl gap-4">
      <header>
        <p className="text-xs font-semibold tracking-wide text-brand-accent-hover uppercase">
          Produtos
        </p>
        <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
          Consultar produto
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Bipe o código de barras ou busque pelo nome.
        </p>
      </header>

      <Button type="button" size="lg" onClick={() => setScannerOpen(true)}>
        <ScanBarcode aria-hidden="true" />
        Abrir a câmera
      </Button>

      <ScanSearchField
        value={query}
        onChange={setQuery}
        onEnter={() => {
          if (results[0]) router.push(`/produtos/${results[0].id}`);
          else if (query.trim()) open(query.trim());
        }}
        onScan={() => setScannerOpen(true)}
        placeholder="Nome ou código do produto"
      />
      <ul className="grid gap-2" aria-label="Produtos encontrados">
        {results.map((product) => (
          <li key={product.id}>
            <Link
              href={`/produtos/${product.id}`}
              className="flex min-h-14 items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-0 px-3 py-2 hover:border-brand-accent focus-visible:outline-2 focus-visible:outline-brand-accent"
            >
              <ProductImage src={product.imageUrl} alt="" className="size-11" />
              <span className="min-w-0 flex-1">
                <strong className="line-clamp-2 text-sm font-semibold text-neutral-900">
                  {product.name}
                </strong>
                <span className="block text-xs text-neutral-500">
                  {product.sku}
                </span>
              </span>
              <strong className="shrink-0 text-sm tabular-nums">
                {formatCents(toCents(product.prices[0]?.salePrice))}
              </strong>
            </Link>
          </li>
        ))}
      </ul>

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={open}
      />
      <UnknownCodeSheet
        code={unknownCode}
        products={products}
        canManageCatalog={canManageCatalog}
        onOpenChange={(next) => !next && setUnknownCode(null)}
        onResolved={(product, how) => {
          setProducts((current) =>
            how === 'created'
              ? [...current, product]
              : current.map((item) =>
                  item.id === product.id ? product : item,
                ),
          );
          setUnknownCode(null);
          router.push(`/produtos/${product.id}`);
        }}
      />
    </main>
  );
}

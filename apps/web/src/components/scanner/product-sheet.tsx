'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScanBarcode, ShoppingCart } from 'lucide-react';
import { Stepper } from '@/components/flow/task-flow';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { primaryBarcode, type CatalogProduct } from '@/lib/catalog';
import { formatCents, toCents } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * Produto bipado na venda: mostra o que importa no balcão — preço, estoque,
 * códigos — e o botão "Adicionar ao carrinho". "Bipar outro" já reabre a
 * câmera para o próximo frasco.
 */
export function ProductSheet({
  product,
  stock,
  inCart,
  onOpenChange,
  onAdd,
  onScanNext,
}: {
  product: CatalogProduct | null;
  stock?: number;
  inCart: number;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: CatalogProduct, quantity: number) => void;
  onScanNext: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [current, setCurrent] = useState<string | null>(null);
  const id = product?.id ?? null;
  if (id !== current) {
    setCurrent(id);
    setQuantity(1);
  }

  const price = product ? toCents(product.prices[0]?.salePrice) : 0;
  const barcode = product ? primaryBarcode(product) : null;
  const short = stock !== undefined && quantity + inCart > stock;

  return (
    <Drawer open={product !== null} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        {product && (
          <div className="grid gap-4 px-4 pb-4">
            <DrawerHeader className="px-0">
              <DrawerTitle className="text-xl">{product.name}</DrawerTitle>
              <DrawerDescription>
                {product.sku}
                {barcode && barcode !== product.sku ? ` · ${barcode}` : ''}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex items-end justify-between gap-3">
              <div>
                <span className="block text-xs text-neutral-500">Preço</span>
                <strong className="text-3xl font-bold text-neutral-900 tabular-nums">
                  {price > 0 ? formatCents(price) : 'Sem preço'}
                </strong>
              </div>
              {stock !== undefined && (
                <span
                  className={cn(
                    'rounded-sm px-2 py-1 text-xs font-semibold',
                    stock <= 0
                      ? 'bg-danger-50 text-danger-600'
                      : 'bg-success-50 text-success-600',
                  )}
                >
                  {stock <= 0 ? 'Sem estoque' : `${stock} em estoque`}
                </span>
              )}
            </div>
            {inCart > 0 && (
              <p className="text-sm text-neutral-700">
                Já tem {inCart} no carrinho.
              </p>
            )}
            {short && (
              <p
                className="rounded-md bg-warning-50 px-3 py-2 text-sm text-neutral-900"
                role="status"
              >
                Só {stock} em estoque. A venda pode ser recusada se a loja não
                permite estoque negativo.
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-neutral-700">
                Quantidade
              </span>
              <Stepper
                value={quantity}
                label={`Quantidade de ${product.name}`}
                decreaseLabel="Menos uma unidade"
                increaseLabel="Mais uma unidade"
                onChange={setQuantity}
              />
            </div>

            <Button
              type="button"
              size="lg"
              onClick={() => onAdd(product, quantity)}
            >
              <ShoppingCart aria-hidden="true" />
              Adicionar ao carrinho
              {price > 0 ? ` · ${formatCents(price * quantity)}` : ''}
            </Button>
            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="tertiary" onClick={onScanNext}>
                <ScanBarcode aria-hidden="true" />
                Bipar outro
              </Button>
              <Button asChild variant="tertiary">
                <Link href={`/produtos/${product.id}`}>
                  Ver página do produto
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

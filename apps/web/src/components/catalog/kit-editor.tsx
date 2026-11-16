'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Stepper } from '@/components/flow/task-flow';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { searchProducts, type CatalogProduct } from '@/lib/catalog';
import {
  KIT_MODE_HINT,
  KIT_MODE_LABEL,
  kitPreview,
  type DraftPiece,
  type KitDetail,
  type KitMode,
} from '@/lib/kits';
import { formatCents, toCents } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * Composição do kit (BR §10.3, regras 11 e 12): escolhe o modo, busca as
 * peças e define quantas de cada. Mostra ao vivo quanto as peças custariam
 * avulsas e quanto o cliente economiza. O custo do kit não é digitado — é a
 * soma das peças (DS-FORM-004).
 */
export function KitEditor({
  open,
  onOpenChange,
  productId,
  productName,
  kitPriceCents,
  initialMode,
  initialPieces,
  products,
  stock,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  kitPriceCents: number;
  initialMode: KitMode | null;
  initialPieces: DraftPiece[];
  products: CatalogProduct[];
  stock: Record<string, number>;
  onSaved: (detail: KitDetail) => void;
}) {
  const [mode, setMode] = useState<KitMode>(initialMode ?? 'on_demand');
  const [pieces, setPieces] = useState<DraftPiece[]>(initialPieces);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [wasOpen, setWasOpen] = useState(open);

  // Reabrir a gaveta recomeça do que está salvo.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMode(initialMode ?? 'on_demand');
      setPieces(initialPieces);
      setQuery('');
      setError(undefined);
    }
  }

  // Só produtos comuns podem ser peça: nada de kit dentro de kit.
  const candidates = useMemo(
    () =>
      products.filter(
        (product) => product.id !== productId && !product.kitMode,
      ),
    [products, productId],
  );
  const results = useMemo(
    () => (query.trim() ? searchProducts(candidates, query).slice(0, 8) : []),
    [candidates, query],
  );
  const preview = kitPreview(pieces, kitPriceCents);

  function add(product: CatalogProduct) {
    const variantId = product.variants[0]?.id;
    if (!variantId) return;
    setPieces((current) =>
      current.some((piece) => piece.productVariantId === variantId)
        ? current.map((piece) =>
            piece.productVariantId === variantId
              ? { ...piece, quantity: piece.quantity + 1 }
              : piece,
          )
        : [
            ...current,
            {
              productVariantId: variantId,
              name: product.name,
              quantity: 1,
              salePriceCents: toCents(product.prices[0]?.salePrice),
              available: stock[variantId] ?? 0,
            },
          ],
    );
    setQuery('');
    setError(undefined);
  }

  async function save() {
    if (pieces.length === 0) return setError('Adicione ao menos uma peça.');
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/kits/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          components: pieces.map((piece) => ({
            productVariantId: piece.productVariantId,
            quantity: piece.quantity,
          })),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as KitDetail & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? 'Não foi possível salvar o kit.');
      onSaved(body);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível salvar.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-lg">
        <div className="grid grid-cols-1 gap-4 overflow-y-auto px-4 pb-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>Montar o kit</DrawerTitle>
            <DrawerDescription>
              Quais produtos formam “{productName}”.
            </DrawerDescription>
          </DrawerHeader>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold text-neutral-700">
              Como você monta este kit?
            </legend>
            {(['on_demand', 'assembled'] as const).map((option) => (
              <label
                key={option}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-md border p-3',
                  mode === option
                    ? 'border-brand-accent bg-brand-accent-subtle'
                    : 'border-neutral-200',
                )}
              >
                <input
                  type="radio"
                  name="kit-mode"
                  value={option}
                  checked={mode === option}
                  onChange={() => setMode(option)}
                  className="mt-1 accent-brand-accent"
                />
                <span>
                  <strong className="block text-sm font-semibold text-neutral-900">
                    {KIT_MODE_LABEL[option]}
                  </strong>
                  <span className="text-xs text-neutral-700">
                    {KIT_MODE_HINT[option]}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid grid-cols-1 gap-2">
            <label
              htmlFor="kit-piece-search"
              className="text-sm font-semibold text-neutral-700"
            >
              Adicionar peça
            </label>
            <input
              id="kit-piece-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, SKU ou código"
              autoComplete="off"
              className="h-12 rounded-md border border-neutral-200 px-3 text-md text-neutral-900 focus:border-brand-accent focus:outline-none"
            />
            {results.length > 0 && (
              <ul
                className="grid grid-cols-1 gap-1 rounded-md border border-neutral-100"
                aria-label="Produtos para adicionar ao kit"
              >
                {results.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => add(product)}
                      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-brand-accent"
                    >
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-semibold text-neutral-900">
                          {product.name}
                        </strong>
                        <span className="text-xs text-neutral-500">
                          {formatCents(toCents(product.prices[0]?.salePrice))} ·{' '}
                          {stock[product.variants[0]?.id ?? ''] ?? 0} em estoque
                        </span>
                      </span>
                      <Plus
                        className="size-4 text-brand-accent-hover"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pieces.length > 0 ? (
            <ul
              className="divide-y divide-neutral-100 rounded-md border border-neutral-100"
              aria-label="Peças do kit"
            >
              {pieces.map((piece) => (
                <li
                  key={piece.productVariantId}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-neutral-900">
                      {piece.name}
                    </strong>
                    <span className="text-xs text-neutral-500">
                      {formatCents(piece.salePriceCents)} avulso ·{' '}
                      {piece.available} em estoque
                    </span>
                  </span>
                  <Stepper
                    value={piece.quantity}
                    min={1}
                    label={`Quantidade de ${piece.name} no kit`}
                    decreaseLabel={`Menos ${piece.name}`}
                    increaseLabel={`Mais ${piece.name}`}
                    removeLabel={`Tirar ${piece.name} do kit`}
                    onChange={(quantity) =>
                      setPieces((current) =>
                        quantity <= 0
                          ? current.filter(
                              (item) =>
                                item.productVariantId !==
                                piece.productVariantId,
                            )
                          : current.map((item) =>
                              item.productVariantId === piece.productVariantId
                                ? { ...item, quantity }
                                : item,
                            ),
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md bg-neutral-25 p-3 text-sm text-neutral-700">
              Busque e adicione os produtos que vão no kit.
            </p>
          )}

          {pieces.length > 0 && (
            <dl className="grid grid-cols-2 gap-2 rounded-md bg-neutral-25 p-3 text-sm">
              <div>
                <dt className="text-xs text-neutral-500">Peças avulsas</dt>
                <dd className="font-semibold text-neutral-900 tabular-nums">
                  {formatCents(preview.separate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Preço do kit</dt>
                <dd className="font-semibold text-neutral-900 tabular-nums">
                  {kitPriceCents > 0 ? formatCents(kitPriceCents) : 'Sem preço'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Cliente economiza</dt>
                <dd className="font-semibold text-success-600 tabular-nums">
                  {formatCents(preview.savings)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">
                  Dá para montar agora
                </dt>
                <dd className="font-semibold text-neutral-900 tabular-nums">
                  {preview.canAssemble}
                </dd>
              </div>
            </dl>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
            >
              {error}
            </p>
          )}

          <Button type="button" size="lg" onClick={save} disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar kit'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

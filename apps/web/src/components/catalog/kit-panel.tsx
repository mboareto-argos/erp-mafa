'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Boxes, PackageOpen, PackagePlus, Pencil } from 'lucide-react';
import { Stepper } from '@/components/flow/task-flow';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { notify } from '@/components/ui/toaster';
import type { CatalogProduct } from '@/lib/catalog';
import { KIT_MODE_LABEL, piecesFromDetail, type KitDetail } from '@/lib/kits';
import { formatCents, toCents } from '@/lib/money';
import { KitEditor } from './kit-editor';

type Operation = 'assemble' | 'disassemble';

/**
 * Bloco "Kit" na página do produto (BR §10.3, regras 11 a 13): peças,
 * economia para o cliente e, no kit "montado antes", montar/desmontar.
 * Ações sem permissão não aparecem (DS-PERM-001); o backend valida de novo.
 */
export function KitPanel({
  productId,
  productName,
  kitPriceCents,
  detail: initialDetail,
  products,
  stock,
  canManageCatalog,
  canAdjustStock,
}: {
  productId: string;
  productName: string;
  kitPriceCents: number;
  detail: KitDetail | null;
  products: CatalogProduct[];
  stock: Record<string, number>;
  canManageCatalog: boolean;
  canAdjustStock: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState(initialDetail);
  const [editing, setEditing] = useState(
    canManageCatalog && searchParams.get('kit') === 'editar',
  );
  const [operation, setOperation] = useState<Operation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const isKit = Boolean(detail?.mode);
  if (!isKit && !canManageCatalog) return null;

  const kitStock = Number(detail?.kitStock ?? 0);
  const maxQuantity =
    operation === 'disassemble' ? kitStock : (detail?.canAssemble ?? 0);

  function openOperation(next: Operation) {
    setOperation(next);
    setQuantity(1);
    setError(undefined);
    setIdempotencyKey(crypto.randomUUID());
  }

  async function run() {
    if (!operation) return;
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/kits/${productId}/${operation}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ quantity }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? 'Não foi possível concluir.');
      notify.success(
        operation === 'assemble'
          ? `${quantity} ${quantity === 1 ? 'kit montado' : 'kits montados'}`
          : `${quantity} ${quantity === 1 ? 'kit desmontado' : 'kits desmontados'}`,
        operation === 'assemble'
          ? 'As peças saíram do estoque.'
          : 'As peças voltaram ao estoque.',
      );
      const refreshed = await fetch(`/api/kits/${productId}`);
      if (refreshed.ok) setDetail((await refreshed.json()) as KitDetail);
      setOperation(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tente de novo.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="kit-title"
      className="grid min-w-0 grid-cols-1 gap-4 rounded-lg border border-neutral-100 bg-neutral-0 p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="kit-title"
            className="flex items-center gap-2 text-lg font-semibold text-neutral-900"
          >
            <Boxes
              className="size-5 text-brand-accent-hover"
              aria-hidden="true"
            />
            {isKit ? 'Kit' : 'Vender como kit'}
          </h2>
          {detail?.mode ? (
            <p className="text-sm text-neutral-500">
              {KIT_MODE_LABEL[detail.mode]}
            </p>
          ) : (
            <p className="text-sm text-neutral-500">
              Junte produtos que você já tem em um kit com preço próprio.
            </p>
          )}
        </div>
        {canManageCatalog && (
          <Button
            type="button"
            variant={isKit ? 'tertiary' : 'secondary'}
            onClick={() => setEditing(true)}
          >
            {isKit ? (
              <Pencil aria-hidden="true" />
            ) : (
              <PackagePlus aria-hidden="true" />
            )}
            {isKit ? 'Editar peças' : 'Transformar em kit'}
          </Button>
        )}
      </div>

      {detail && isKit && (
        <>
          <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-100">
            {detail.components.map((piece) => (
              <li
                key={piece.productVariantId}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <strong className="block truncate font-semibold text-neutral-900">
                    {Number(piece.quantity)} × {piece.name}
                  </strong>
                  <span className="text-xs text-neutral-500">
                    {Number(piece.available)} em estoque
                  </span>
                </span>
                <span className="shrink-0 text-neutral-700 tabular-nums">
                  {formatCents(
                    toCents(piece.salePrice) * Number(piece.quantity),
                  )}
                </span>
              </li>
            ))}
          </ul>

          <dl className="grid grid-cols-2 gap-3 rounded-md bg-neutral-25 p-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-neutral-500">Peças avulsas</dt>
              <dd className="font-semibold text-neutral-900 tabular-nums">
                {formatCents(toCents(detail.piecesPrice))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Cliente economiza</dt>
              <dd className="font-semibold text-success-600 tabular-nums">
                {formatCents(toCents(detail.savings))}
              </dd>
            </div>
            {detail.mode === 'assembled' && (
              <div>
                <dt className="text-xs text-neutral-500">Kits prontos</dt>
                <dd className="font-semibold text-neutral-900 tabular-nums">
                  {kitStock}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-neutral-500">
                {detail.mode === 'assembled'
                  ? 'Dá para montar mais'
                  : 'Dá para vender agora'}
              </dt>
              <dd className="font-semibold text-neutral-900 tabular-nums">
                {detail.canAssemble}
              </dd>
            </div>
          </dl>

          {detail.mode === 'assembled' && canAdjustStock && (
            <div className="grid gap-2 sm:flex">
              <Button
                type="button"
                size="lg"
                disabled={detail.canAssemble < 1}
                onClick={() => openOperation('assemble')}
              >
                <PackagePlus aria-hidden="true" />
                Montar kits
              </Button>
              {kitStock > 0 && (
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  onClick={() => openOperation('disassemble')}
                >
                  <PackageOpen aria-hidden="true" />
                  Desmontar
                </Button>
              )}
            </div>
          )}
          {detail.mode === 'assembled' &&
            canAdjustStock &&
            detail.canAssemble < 1 && (
              <p className="text-sm text-neutral-700">
                Faltam peças em estoque para montar mais um kit.
              </p>
            )}
        </>
      )}

      {canManageCatalog && (
        <KitEditor
          open={editing}
          onOpenChange={setEditing}
          productId={productId}
          productName={productName}
          kitPriceCents={kitPriceCents}
          initialMode={detail?.mode ?? null}
          initialPieces={detail ? piecesFromDetail(detail) : []}
          products={products}
          stock={stock}
          onSaved={(saved) => {
            setDetail(saved);
            setEditing(false);
            notify.success('Kit salvo', productName);
            router.refresh();
          }}
        />
      )}

      <Drawer
        open={operation !== null}
        onOpenChange={(open) => !open && setOperation(null)}
      >
        <DrawerContent className="mx-auto max-w-lg">
          <div className="grid grid-cols-1 gap-4 px-4 pb-4">
            <DrawerHeader className="px-0">
              <DrawerTitle>
                {operation === 'assemble' ? 'Montar kits' : 'Desmontar kits'}
              </DrawerTitle>
              <DrawerDescription>
                {operation === 'assemble'
                  ? 'As peças saem do estoque e os kits prontos entram.'
                  : 'Os kits saem do estoque e as peças voltam.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-neutral-700">
                Quantos kits?
              </span>
              <Stepper
                value={quantity}
                min={1}
                max={Math.max(1, maxQuantity)}
                label="Quantidade de kits"
                decreaseLabel="Um kit a menos"
                increaseLabel="Um kit a mais"
                onChange={setQuantity}
              />
            </div>
            {operation === 'assemble' && detail && (
              <ul className="grid gap-1 rounded-md bg-neutral-25 p-3 text-sm text-neutral-700">
                {detail.components.map((piece) => (
                  <li key={piece.productVariantId}>
                    Sai {Number(piece.quantity) * quantity} × {piece.name}
                  </li>
                ))}
              </ul>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
              >
                {error}
              </p>
            )}
            <Button type="button" size="lg" onClick={run} disabled={pending}>
              {pending
                ? 'Registrando…'
                : operation === 'assemble'
                  ? `Montar ${quantity}`
                  : `Desmontar ${quantity}`}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  );
}

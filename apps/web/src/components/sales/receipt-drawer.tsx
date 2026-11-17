'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { notify } from '@/components/ui/toaster';
import { ReceiptShare } from './receipt-share';

/**
 * Recibo de uma venda já confirmada (BR §10.10, regra 26): busca o link
 * ativo (cria se a venda é anterior ao recibo) e permite gerar outro,
 * invalidando o anterior.
 */
export function ReceiptDrawer({
  saleId,
  open,
  onOpenChange,
  storeName,
  customerName,
  customerWhatsapp,
}: {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  customerName?: string | null;
  customerWhatsapp?: string | null;
}) {
  const [token, setToken] = useState<string>();
  const [error, setError] = useState<string>();
  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  async function load(rotate: boolean) {
    const response = await fetch(`/api/sales/${saleId}/receipt-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rotate }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      token?: string;
      message?: string;
    };
    if (!response.ok || !body.token)
      throw new Error(body.message ?? 'Não foi possível abrir o recibo.');
    return body.token;
  }

  useEffect(() => {
    if (!open || token) return;
    let active = true;
    load(false)
      .then((value) => active && setToken(value))
      .catch(
        (cause: unknown) =>
          active &&
          setError(cause instanceof Error ? cause.message : 'Tente de novo.'),
      );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carrega uma vez ao abrir
  }, [open]);

  async function rotate() {
    setRotating(true);
    try {
      setToken(await load(true));
      setConfirmRotate(false);
      notify.success(
        'Link novo gerado',
        'O link anterior não abre mais o recibo.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tente de novo.');
    } finally {
      setRotating(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <div className="grid grid-cols-1 gap-4 px-4 pb-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>Recibo da venda</DrawerTitle>
            <DrawerDescription>
              O cliente abre pelo link, sem login, e pode baixar em PDF ou
              imprimir.
            </DrawerDescription>
          </DrawerHeader>
          {error && (
            <p
              role="alert"
              className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
            >
              {error}
            </p>
          )}
          {!token && !error && (
            <p className="text-sm text-neutral-500">Carregando o recibo…</p>
          )}
          {token && (
            <ReceiptShare
              token={token}
              storeName={storeName}
              customerName={customerName}
              customerWhatsapp={customerWhatsapp}
            />
          )}
          {token &&
            (confirmRotate ? (
              <div className="grid gap-2 rounded-md bg-warning-50 p-3 text-sm text-neutral-900">
                <p>
                  O link atual deixa de abrir o recibo. Use se ele foi enviado
                  para a pessoa errada.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={rotate}
                    disabled={rotating}
                  >
                    Gerar link novo
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    onClick={() => setConfirmRotate(false)}
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="tertiary"
                className="justify-self-start"
                onClick={() => setConfirmRotate(true)}
              >
                <RefreshCw aria-hidden="true" />
                Gerar link novo
              </Button>
            ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toaster';
import { resizeImage } from '@/lib/image-resize';
import { ProductImage } from './product-image';

/**
 * Foto principal na página do produto. No celular, "Tirar ou escolher foto"
 * abre a câmera ou a galeria (escolha do sistema). A foto é reduzida antes
 * de enviar. Sem manage_catalog, só exibe (DS-PERM-001).
 */
export function ProductPhotoEditor({
  productId,
  productName,
  imageUrl,
  canManage,
}: {
  productId: string;
  productName: string;
  imageUrl: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(imageUrl);
  const [pending, setPending] = useState<'upload' | 'remove'>();

  async function upload(file: File) {
    setPending('upload');
    try {
      const resized = await resizeImage(file);
      const form = new FormData();
      form.append('file', resized, 'foto.jpg');
      const response = await fetch(`/api/catalog/products/${productId}/image`, {
        method: 'POST',
        body: form,
      });
      const body = (await response.json().catch(() => ({}))) as {
        imageUrl?: string;
        message?: string;
      };
      if (!response.ok || !body.imageUrl)
        throw new Error(body.message ?? 'Não foi possível salvar a foto.');
      setCurrent(body.imageUrl);
      notify.success('Foto salva', productName);
      router.refresh();
    } catch (cause) {
      notify.error(
        'Não foi possível salvar a foto',
        cause instanceof Error ? cause.message : undefined,
      );
    } finally {
      setPending(undefined);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    setPending('remove');
    try {
      const response = await fetch(`/api/catalog/products/${productId}/image`, {
        method: 'DELETE',
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? 'Não foi possível remover a foto.');
      setCurrent(null);
      notify.success('Foto removida', productName);
      router.refresh();
    } catch (cause) {
      notify.error(
        'Não foi possível remover a foto',
        cause instanceof Error ? cause.message : undefined,
      );
    } finally {
      setPending(undefined);
    }
  }

  return (
    <div className="grid gap-2">
      <ProductImage
        src={current}
        alt={current ? `Foto de ${productName}` : ''}
        className="aspect-square w-full rounded-lg"
        iconClassName="size-16"
        sizes="(min-width: 600px) 280px, 100vw"
      />
      {canManage && (
        <div className="flex gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            id={`photo-${productId}`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            loading={pending === 'upload'}
            disabled={Boolean(pending)}
            onClick={() => input.current?.click()}
          >
            <Camera aria-hidden="true" />
            {current ? 'Trocar foto' : 'Tirar ou escolher foto'}
          </Button>
          {current && (
            <Button
              type="button"
              variant="tertiary"
              size="icon"
              loading={pending === 'remove'}
              disabled={Boolean(pending)}
              onClick={remove}
              aria-label="Remover foto"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

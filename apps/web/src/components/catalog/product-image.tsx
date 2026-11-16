import Image from 'next/image';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Foto do produto (ou um ícone neutro quando ainda não tem). As fotos já
 * chegam reduzidas pelo celular (ADR-0003), então não passam pela
 * otimização de imagem do Vercel (unoptimized) — sem custo extra.
 */
export function ProductImage({
  src,
  alt,
  className,
  iconClassName,
  sizes = '64px',
}: {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
  sizes?: string;
}) {
  return (
    <span
      className={cn(
        'relative block shrink-0 overflow-hidden rounded-md bg-neutral-50',
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          className="object-cover"
        />
      ) : (
        <span
          className="absolute inset-0 grid place-items-center text-neutral-300"
          aria-hidden="true"
        >
          <Package
            className={cn('size-1/2', iconClassName)}
            strokeWidth={1.4}
          />
        </span>
      )}
    </span>
  );
}

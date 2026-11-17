import {
  LOGO_CHECK_PATH,
  LOGO_CHECK_WIDTH,
  LOGO_GOLD,
  LOGO_HOLE,
  LOGO_INK,
  LOGO_TAG_PATH,
  PRODUCT_NAME,
} from '@/lib/brand';
import { cn } from '@/lib/utils';

/** Símbolo do Vendaí (etiqueta de preço com check) sobre o dourado. */
export function BrandMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <rect width="100" height="100" rx="22" fill={LOGO_GOLD} />
      <path d={LOGO_TAG_PATH} fill={LOGO_INK} />
      <circle
        cx={LOGO_HOLE.cx}
        cy={LOGO_HOLE.cy}
        r={LOGO_HOLE.r}
        fill={LOGO_GOLD}
      />
      <path
        d={LOGO_CHECK_PATH}
        fill="none"
        stroke={LOGO_GOLD}
        strokeWidth={LOGO_CHECK_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Logo completa: símbolo + nome do produto. */
export function BrandLogo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <BrandMark size={size} />
      <span>{PRODUCT_NAME}</span>
    </span>
  );
}

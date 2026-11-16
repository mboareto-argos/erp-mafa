import { notFound } from 'next/navigation';
import { appIconImage } from '@/lib/app-icon-image';
import { ICON_SIZES, type IconVariant } from '@/lib/app-identity';

// Ícones do manifesto (Android/Chrome). Gerados no build — nada de binário
// no repositório.
export const dynamic = 'force-static';

export function generateStaticParams() {
  return ICON_SIZES.map((size) => ({ size }));
}

export async function GET(
  _request: Request,
  context: RouteContext<'/pwa-icon/[size]'>,
) {
  const { size } = await context.params;
  if (!ICON_SIZES.includes(size as IconVariant)) notFound();
  if (size === 'maskable-512')
    return appIconImage(512, { rounded: false, safeZone: true });
  return appIconImage(Number(size));
}

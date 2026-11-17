import { ImageResponse } from 'next/og';
import {
  LOGO_CHECK_PATH,
  LOGO_CHECK_WIDTH,
  LOGO_GOLD,
  LOGO_HOLE,
  LOGO_INK,
  LOGO_TAG_PATH,
} from './brand';

/**
 * Ícone do app: a etiqueta de preço do Vendaí sobre o dourado.
 * `safeZone` encolhe o desenho para os ícones "maskable" do Android, que o
 * sistema recorta em círculo/gota — o conteúdo precisa caber nos 80% centrais.
 * `rounded: false` para o iPhone, que arredonda sozinho.
 */
export async function appIconImage(
  size: number,
  { rounded = true, safeZone = false } = {},
) {
  const art = size * (safeZone ? 0.72 : 1);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: LOGO_GOLD,
        borderRadius: rounded ? size * 0.22 : 0,
      }}
    >
      <svg width={art} height={art} viewBox="0 0 100 100">
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
    </div>,
    { width: size, height: size },
  );
}

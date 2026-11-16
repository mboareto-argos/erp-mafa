import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { APP_ACCENT, APP_INK, APP_NAME } from './app-identity';

/**
 * Ícone do app: a inicial da loja sobre o dourado (mesmo "M" do cabeçalho).
 * `safeZone` encolhe o desenho para os ícones "maskable" do Android, que o
 * sistema recorta em círculo/gota — o conteúdo precisa caber nos 80% centrais.
 */
// Inter Bold, a mesma fonte do app (DS §4.4). Os ícones são gerados no
// build (estáticos), quando o arquivo da fonte está disponível.
const interBold = () =>
  readFile(join(process.cwd(), 'src/app/fonts/inter-700.ttf'));

export async function appIconImage(
  size: number,
  { rounded = true, safeZone = false } = {},
) {
  const letter = APP_NAME.trim().charAt(0).toUpperCase() || 'M';
  const scale = safeZone ? 0.62 : 0.78;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: APP_ACCENT,
        borderRadius: rounded ? size * 0.22 : 0,
      }}
    >
      <span
        style={{
          color: APP_INK,
          fontSize: size * scale * 0.82,
          fontWeight: 700,
          fontFamily: 'Inter',
          lineHeight: 1,
          marginTop: size * 0.02,
        }}
      >
        {letter}
      </span>
    </div>,
    {
      width: size,
      height: size,
      fonts: [
        {
          name: 'Inter',
          data: await interBold(),
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );
}

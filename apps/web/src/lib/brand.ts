// Marca do produto (Vendaí): etiqueta de preço com a venda "feita" (check).
// Desenho num quadro 100x100 — usado no ícone do app (ImageResponse) e no
// componente <BrandLogo>, para os dois nunca divergirem.
export const PRODUCT_NAME = 'Vendaí';

export const LOGO_TAG_PATH =
  'M22 28 a6 6 0 0 1 6 -6 h26 a6 6 0 0 1 4.2 1.8 l20 20 a6 6 0 0 1 0 8.5 l-26 26 a6 6 0 0 1 -8.5 0 l-20 -20 a6 6 0 0 1 -1.7 -4.2 z';
export const LOGO_HOLE = { cx: 36, cy: 36, r: 5.5 };
export const LOGO_CHECK_PATH = 'M40 54 L48 62 L62 48';
export const LOGO_CHECK_WIDTH = 6;

// Cores fixas da marca do produto. Não usar o token brand.accent: ele muda
// por empresa (white-label, DS §6), e a logo do Vendaí é a mesma para todas.
export const LOGO_GOLD = '#C49A28';
export const LOGO_INK = '#0B0F19';

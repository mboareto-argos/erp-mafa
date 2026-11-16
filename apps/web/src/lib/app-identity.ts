import tokens from '@erp-mafa/design-tokens/tokens.json';

// Identidade do app instalável (PWA). Hoje há uma só empresa por
// implantação; NEXT_PUBLIC_APP_NAME permite trocar o nome sem mudar código
// (white-label — DS §6). As cores vêm dos tokens do Design System.
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'MAFA Store';
export const APP_DESCRIPTION =
  'Vendas, compras, estoque e financeiro da loja no celular.';
export const APP_ACCENT = tokens.color.brand.accent;
export const APP_INK = tokens.color.neutral['950'];
export const APP_SURFACE = tokens.color.neutral['0'];
export const APP_BACKGROUND = tokens.color.neutral['25'];

export const ICON_SIZES = ['192', '512', 'maskable-512'] as const;
export type IconVariant = (typeof ICON_SIZES)[number];

import type { Config } from 'tailwindcss';
import tokens from '@erp-mafa/design-tokens/tokens.json';

// Tema do Tailwind derivado diretamente de packages/design-tokens/tokens.json —
// nenhum valor de cor/espaçamento/tipografia é redigitado aqui (ver
// packages/design-tokens/README.md e docs/product/design-system.md, secao 4).
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        neutral: tokens.color.neutral,
        success: tokens.color.success,
        danger: tokens.color.danger,
        warning: tokens.color.warning,
        info: tokens.color.info,
        brand: {
          accent: tokens.color.brand.accent,
          'accent-hover': tokens.color.brand.accentHover,
          'accent-subtle': tokens.color.brand.accentSubtle,
        },
      },
      fontFamily: {
        sans: tokens.font.family.sans.split(', '),
        mono: tokens.font.family.mono.split(', '),
      },
      fontSize: tokens.font.size,
      spacing: tokens.space,
      borderRadius: tokens.radius,
      boxShadow: tokens.shadow,
      screens: {
        sm: tokens.breakpoint.sm,
        md: tokens.breakpoint.md,
        lg: tokens.breakpoint.lg,
        xl: tokens.breakpoint.xl,
      },
      minWidth: {
        touch: tokens.touchTargetMin,
      },
      minHeight: {
        touch: tokens.touchTargetMin,
      },
    },
  },
};

export default config;

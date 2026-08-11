import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Familia tipografica definida em docs/product/design-system.md, secao 4.4
// (token font.family em packages/design-tokens/tokens.json).
const fontSans = localFont({
  src: [
    { path: './fonts/inter-400.ttf', weight: '400', style: 'normal' },
    { path: './fonts/inter-600.ttf', weight: '600', style: 'normal' },
    { path: './fonts/inter-700.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

const fontMono = localFont({
  src: [
    { path: './fonts/jetbrains-mono-400.ttf', weight: '400', style: 'normal' },
    { path: './fonts/jetbrains-mono-600.ttf', weight: '600', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['monospace'],
});

export const metadata: Metadata = {
  title: 'ERP MAFA Store',
  description: 'ERP simplificado para pequenos vendedores.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

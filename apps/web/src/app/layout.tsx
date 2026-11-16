import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';
import { Toaster } from '@/components/ui/toaster';
import { APP_DESCRIPTION, APP_NAME, APP_SURFACE } from '@/lib/app-identity';
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
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  // iPhone: "Adicionar à Tela de Início" abre em tela cheia, com o nome da
  // loja embaixo do ícone (apple-icon.tsx).
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  // iOS anteriores ao 16.4 só abrem em tela cheia com a tag antiga.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  themeColor: APP_SURFACE,
  // Ocupa a tela toda no iPhone; o layout já respeita as bordas com
  // env(safe-area-inset-*) na barra inferior e nos rodapés fixos.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

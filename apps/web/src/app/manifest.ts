import type { MetadataRoute } from 'next';
import {
  APP_BACKGROUND,
  APP_DESCRIPTION,
  APP_NAME,
  APP_SURFACE,
} from '@/lib/app-identity';

// Manifesto do app instalável (PWA): abre em tela cheia, sem a barra do
// navegador, direto no Início. Os atalhos aparecem ao segurar o ícone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/inicio',
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    lang: 'pt-BR',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: APP_BACKGROUND,
    theme_color: APP_SURFACE,
    icons: [
      {
        src: '/pwa-icon/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon/maskable-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Nova venda', url: '/vendas/nova' },
      { name: 'Consultar produto', url: '/produtos/consultar' },
      { name: 'Nova compra', url: '/compras/nova' },
      { name: 'Quem me deve', url: '/financeiro/quem-me-deve' },
    ],
  };
}

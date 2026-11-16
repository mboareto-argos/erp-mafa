import { WifiOff } from 'lucide-react';
import { RetryButton } from '@/components/pwa/retry-button';

// Mostrada pelo service worker (public/sw.js) quando não há internet.
// Estática e fora do layout autenticado: precisa abrir sem falar com a API.
export const dynamic = 'force-static';
export const metadata = { title: 'Sem conexão' };

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-25 p-6 text-center">
      <div className="grid max-w-sm justify-items-center gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-neutral-50 text-neutral-500">
          <WifiOff className="size-7" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-semibold text-neutral-900">
          Sem conexão com a internet
        </h1>
        <p className="text-sm text-neutral-500">
          Vendas, estoque e financeiro precisam da internet para mostrar os
          números certos. Confira o Wi-Fi ou os dados móveis e tente de novo.
        </p>
        <RetryButton />
      </div>
    </main>
  );
}

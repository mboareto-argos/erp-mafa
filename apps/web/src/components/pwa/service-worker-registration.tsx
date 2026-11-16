'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker (public/sw.js) só em produção: em
 * desenvolvimento ele atrapalharia o hot reload sem trazer nada.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    )
      return;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => undefined);
  }, []);
  return null;
}

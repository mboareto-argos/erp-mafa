'use client';

import { useSyncExternalStore } from 'react';

// Estado da instalação do app (PWA), compartilhado pela tela toda.
// O Chrome/Android dispara `beforeinstallprompt` cedo, às vezes antes de
// qualquer componente montar — por isso o listener é registrado no
// carregamento do módulo e guardado aqui.

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export type InstallPlatform = 'prompt' | 'ios' | 'none';
export type InstallState = { installed: boolean; platform: InstallPlatform };

let deferred: InstallEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // nós mostramos o convite no momento certo
    deferred = event as InstallEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    notify();
  });
}

/** iPhone/iPad (inclui iPad que se identifica como Mac). */
export function isIOS(userAgent: string, maxTouchPoints: number) {
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  );
}

export function computeInstallState(input: {
  standalone: boolean;
  installedNow: boolean;
  hasPrompt: boolean;
  ios: boolean;
}): InstallState {
  if (input.standalone || input.installedNow)
    return { installed: true, platform: 'none' };
  if (input.hasPrompt) return { installed: false, platform: 'prompt' };
  if (input.ios) return { installed: false, platform: 'ios' };
  return { installed: false, platform: 'none' };
}

let cached: InstallState = { installed: false, platform: 'none' };
function snapshot(): InstallState {
  const next = computeInstallState({
    standalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    installedNow,
    hasPrompt: deferred !== null,
    ios: isIOS(navigator.userAgent, navigator.maxTouchPoints),
  });
  if (next.installed !== cached.installed || next.platform !== cached.platform)
    cached = next;
  return cached;
}
const serverSnapshot: InstallState = { installed: false, platform: 'none' };

export function useInstallState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
    () => serverSnapshot,
  );
}

/** Abre o pedido nativo de instalação (Android/Chrome). */
export async function promptInstall() {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === 'accepted';
}

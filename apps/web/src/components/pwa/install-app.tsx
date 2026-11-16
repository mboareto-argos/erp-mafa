'use client';

import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { APP_NAME } from '@/lib/app-identity';
import { promptInstall, useInstallState } from '@/lib/install-prompt';

const DISMISS_KEY = 'erp_mafa_install_card_dismissed';

/** Passo a passo do iPhone: o Safari não deixa o site oferecer a instalação. */
function IosSteps({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <div className="grid gap-4 px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>Instalar no iPhone</DrawerTitle>
            <DrawerDescription>
              Leva 10 segundos e o {APP_NAME} vira um ícone na sua tela.
            </DrawerDescription>
          </DrawerHeader>
          <ol className="grid gap-3 text-sm text-neutral-700">
            <li className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-accent-subtle font-semibold text-brand-accent-hover">
                1
              </span>
              <span>
                Na barra do Safari, toque em{' '}
                <strong className="text-neutral-900">Compartilhar</strong>{' '}
                <Share
                  className="inline size-4 align-text-bottom"
                  aria-label="(ícone de quadrado com seta para cima)"
                />
                .
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-accent-subtle font-semibold text-brand-accent-hover">
                2
              </span>
              <span>
                Role a lista e toque em{' '}
                <strong className="text-neutral-900">
                  Adicionar à Tela de Início
                </strong>{' '}
                <SquarePlus
                  className="inline size-4 align-text-bottom"
                  aria-hidden="true"
                />
                .
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-accent-subtle font-semibold text-brand-accent-hover">
                3
              </span>
              <span>
                Toque em <strong className="text-neutral-900">Adicionar</strong>
                . Pronto: abra pelo ícone novo, em tela cheia.
              </span>
            </li>
          </ol>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Entendi
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function useInstallAction() {
  const state = useInstallState();
  const [iosOpen, setIosOpen] = useState(false);
  const available = !state.installed && state.platform !== 'none';
  const install = () =>
    state.platform === 'ios' ? setIosOpen(true) : void promptInstall();
  const steps = <IosSteps open={iosOpen} onOpenChange={setIosOpen} />;
  return { available, install, steps };
}

/** Cartão no Início convidando a instalar; some quando dispensado ou instalado. */
export function InstallAppCard() {
  const { available, install, steps } = useInstallAction();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!available || dismissed) return steps;
  return (
    <>
      <section
        className="mb-4 flex items-center gap-3 rounded-lg border border-brand-accent bg-brand-accent-subtle p-3"
        aria-label="Instalar o app"
      >
        <Download
          className="size-6 shrink-0 text-brand-accent-hover"
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 text-sm text-neutral-900">
          <strong className="block">Use o {APP_NAME} como app</strong>
          Ícone na tela do celular, abre em tela cheia.
        </p>
        <Button type="button" size="sm" onClick={install}>
          Instalar
        </Button>
        <button
          type="button"
          aria-label="Dispensar convite para instalar"
          className="grid size-9 shrink-0 place-items-center rounded-full text-neutral-500 hover:bg-white/60"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(DISMISS_KEY, '1');
            } catch {
              // sem armazenamento: só esconde nesta visita
            }
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </section>
      {steps}
    </>
  );
}

/** Item "Instalar app" (aba Mais); aparece sempre que der para instalar. */
export function InstallAppButton({ onDone }: { onDone?: () => void }) {
  const { available, install, steps } = useInstallAction();
  if (!available) return steps;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          install();
          onDone?.();
        }}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold text-brand-accent-hover hover:bg-brand-accent-subtle"
      >
        <Download className="size-5" aria-hidden="true" />
        <span className="text-sm">Instalar app no celular</span>
      </button>
      {steps}
    </>
  );
}

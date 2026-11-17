'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Abre a impressão do navegador — lá dá para "Salvar como PDF". */
export function PrintButton() {
  return (
    <Button type="button" size="lg" onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      Baixar PDF ou imprimir
    </Button>
  );
}

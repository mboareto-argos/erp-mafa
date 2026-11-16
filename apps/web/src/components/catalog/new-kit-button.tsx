'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { QuickProductForm } from './quick-product-form';

/**
 * "Novo kit" (BR §10.3, regra 11): cadastra o kit como produto (nome e
 * preço próprio) e já abre a página dele com a escolha das peças.
 */
export function NewKitButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState('');

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setSku(`KIT-${Date.now().toString(36).toUpperCase()}`);
          setOpen(true);
        }}
      >
        <Boxes aria-hidden="true" />
        Novo kit
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-lg">
          <div className="grid gap-4 overflow-y-auto px-4 pb-4">
            <DrawerHeader className="px-0">
              <DrawerTitle>Novo kit</DrawerTitle>
              <DrawerDescription>
                Dê um nome e o preço do kit. Em seguida você escolhe as peças.
              </DrawerDescription>
            </DrawerHeader>
            {open && (
              <QuickProductForm
                initialSku={sku}
                submitLabel="Continuar para as peças"
                onCancel={() => setOpen(false)}
                onCreated={(product) => {
                  setOpen(false);
                  router.push(`/produtos/${product.id}?kit=editar`);
                }}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

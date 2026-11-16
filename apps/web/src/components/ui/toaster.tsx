'use client';

import { Toaster as Sonner, toast } from 'sonner';

// Toasts (DS §8.8): sucesso some sozinho em ~5s; erro NÃO some sozinho
// (DS-NOTIF-001) porque normalmente pede uma ação do usuário.
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      duration={5000}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-lg border border-neutral-100 bg-neutral-0 text-neutral-900 shadow-md font-sans',
          description: 'text-neutral-500',
        },
      }}
    />
  );
}

export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),
  error: (message: string, description?: string) =>
    toast.error(message, { description, duration: Infinity }),
};

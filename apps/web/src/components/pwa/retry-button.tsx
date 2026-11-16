'use client';

import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RetryButton() {
  return (
    <Button type="button" size="lg" onClick={() => window.location.reload()}>
      <RotateCw aria-hidden="true" />
      Tentar de novo
    </Button>
  );
}

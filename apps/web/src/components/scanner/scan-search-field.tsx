'use client';

import type { KeyboardEvent } from 'react';
import { PackageSearch, ScanBarcode } from 'lucide-react';

/**
 * Busca de produto com o botão da câmera. Também aceita leitor de código
 * USB/Bluetooth, que "digita" o código e aperta Enter (onEnter).
 */
export function ScanSearchField({
  value,
  onChange,
  onEnter,
  onScan,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  onScan: () => void;
  placeholder: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onEnter();
  }
  return (
    <div className="relative">
      <PackageSearch
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-neutral-300"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Buscar produto por nome ou código"
        autoComplete="off"
        className="h-12 w-full rounded-md border border-neutral-200 bg-neutral-0 pr-14 pl-10 text-md text-neutral-900 focus:border-brand-accent focus:outline-none"
      />
      <button
        type="button"
        onClick={onScan}
        aria-label="Bipar com a câmera"
        className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-md bg-brand-accent-subtle text-brand-accent-hover hover:bg-brand-accent hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-brand-accent"
      >
        <ScanBarcode className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

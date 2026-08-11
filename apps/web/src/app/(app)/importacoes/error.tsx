'use client';

import { ListingError } from '@/components/listings/listing-error';

export default function ImportsError({ reset }: { reset: () => void }) {
  return (
    <main className="page-content">
      <ListingError reset={reset} />
    </main>
  );
}

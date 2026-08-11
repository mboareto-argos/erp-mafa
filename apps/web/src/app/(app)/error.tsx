'use client';

import { ListingError } from '@/components/listings/listing-error';

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-content">
      <ListingError
        reset={reset}
        title="Não foi possível carregar esta página"
        description="Confira sua conexão e tente novamente. Se o problema continuar, sua sessão pode ter expirado."
      />
    </main>
  );
}

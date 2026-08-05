"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="page-content"><section className="empty-card"><h1>Não foi possível carregar esta página</h1><p>Confira sua conexão e tente novamente. Se o problema continuar, sua sessão pode ter expirado.</p><button className="button button-primary compact-button" onClick={reset}>Tentar novamente</button></section></main>;
}

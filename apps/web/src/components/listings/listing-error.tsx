"use client";

export function ListingError({ reset, title = "Não foi possível carregar esta lista", description = "Confira sua conexão e tente novamente. Se o problema continuar, fale com quem administra a loja." }: { reset: () => void; title?: string; description?: string }) {
  return (
    <section className="empty-card" role="alert">
      <span className="empty-state-mark error-state-mark" aria-hidden="true">!</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="button button-primary compact-button" type="button" onClick={reset}>
        Tentar novamente
      </button>
    </section>
  );
}

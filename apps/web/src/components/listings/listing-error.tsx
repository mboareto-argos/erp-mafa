"use client";

export function ListingError({ reset }: { reset: () => void }) {
  return (
    <section className="empty-card" role="alert">
      <h2>Não foi possível carregar esta lista</h2>
      <p>Confira sua conexão e tente novamente. Se o problema continuar, fale com quem administra a loja.</p>
      <button className="button button-primary compact-button" type="button" onClick={reset}>
        Tentar novamente
      </button>
    </section>
  );
}

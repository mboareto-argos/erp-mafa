import type { ReactNode } from "react";

type SearchProps = {
  id: string;
  label: string;
  placeholder: string;
  query?: string;
};

export function ListingSearch({ id, label, placeholder, query }: SearchProps) {
  return (
    <form method="GET" className="mb-5 grid gap-2">
      <div className="field mb-0">
        <label htmlFor={id}>{label}</label>
        <input id={id} name="q" defaultValue={query} placeholder={placeholder} />
      </div>
      <button className="button button-secondary compact-button" type="submit">
        Buscar
      </button>
    </form>
  );
}

export function ListingTable({
  headers,
  children,
}: {
  headers: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="data-card overflow-hidden">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{headers}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </section>
  );
}

export function ListingEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="empty-card" aria-live="polite">
      <span className="mb-3 inline-grid h-touch w-touch place-items-center rounded-full bg-brand-accent-subtle text-xl" aria-hidden="true">
        ◌
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export function ListingPagination({
  page,
  total,
  pageSize,
  query,
}: {
  page: number;
  total: number;
  pageSize: number;
  query?: string;
}) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  if (totalPages <= 1) return null;

  const hrefFor = (nextPage: number) => {
    const params = new URLSearchParams({ page: String(nextPage) });
    if (query) params.set("q", query);
    return `?${params.toString()}`;
  };

  return (
    <nav className="page-actions mt-4" aria-label="Paginação">
      {page > 1 && (
        <a className="button button-secondary compact-button" href={hrefFor(page - 1)}>
          Anterior
        </a>
      )}
      <span className="user-chip" aria-current="page">
        Página {page} de {totalPages}
      </span>
      {page < totalPages && (
        <a className="button button-secondary compact-button" href={hrefFor(page + 1)}>
          Próxima
        </a>
      )}
    </nav>
  );
}

export function ListingSkeleton() {
  return (
    <section className="data-card" aria-label="Carregando lista" aria-busy="true">
      <div className="skeleton-table">
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

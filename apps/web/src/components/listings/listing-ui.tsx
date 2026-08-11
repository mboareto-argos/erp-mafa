import type { ReactNode } from 'react';
import { AppIcon, type IconName } from '@/components/layout/app-icon';

type SearchProps = {
  id: string;
  label: string;
  placeholder: string;
  query?: string;
};

export function ListingSearch({ id, label, placeholder, query }: SearchProps) {
  return (
    <form method="GET" className="listing-search">
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          name="q"
          defaultValue={query}
          placeholder={placeholder}
        />
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
    <section className="data-card">
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

export function ListingMetrics({
  metrics,
}: {
  metrics: Array<{
    label: string;
    value: string | number;
    detail: string;
    icon: IconName;
  }>;
}) {
  return (
    <section className="listing-metrics" aria-label="Resumo da listagem">
      {metrics.map((metric) => (
        <article className="listing-metric" key={metric.label}>
          <span className="listing-metric-icon">
            <AppIcon name={metric.icon} />
          </span>
          <div>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </div>
        </article>
      ))}
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
      <span className="empty-state-mark" aria-hidden="true">
        ✦
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
  extraParams,
}: {
  page: number;
  total: number;
  pageSize: number;
  query?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  if (totalPages <= 1) return null;

  const hrefFor = (nextPage: number) => {
    const params = new URLSearchParams({ page: String(nextPage) });
    if (query) params.set('q', query);
    Object.entries(extraParams ?? {}).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `?${params.toString()}`;
  };

  return (
    <nav className="page-actions listing-pagination" aria-label="Paginação">
      {page > 1 && (
        <a
          className="button button-secondary compact-button"
          href={hrefFor(page - 1)}
        >
          Anterior
        </a>
      )}
      <span className="user-chip" aria-current="page">
        Página {page} de {totalPages}
      </span>
      {page < totalPages && (
        <a
          className="button button-secondary compact-button"
          href={hrefFor(page + 1)}
        >
          Próxima
        </a>
      )}
    </nav>
  );
}

export function ListingSkeleton() {
  return (
    <section
      className="data-card"
      aria-label="Carregando lista"
      aria-busy="true"
    >
      <div className="skeleton-table">
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

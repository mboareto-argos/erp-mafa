// Paginação opcional e retrocompatível (mesmo padrão de produtos/clientes):
// sem `page` a listagem devolve o array completo de sempre; com `page`,
// devolve `{ items, total, page, pageSize, ... }`.
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type PageRequest = { page: number; pageSize: number };

export function parsePage(
  page?: string,
  pageSize?: string,
): PageRequest | null {
  if (page === undefined || page === '') return null;
  const parsedPage = Math.max(Math.trunc(Number(page)) || 1, 1);
  const parsedSize = Math.min(
    Math.max(Math.trunc(Number(pageSize)) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  return { page: parsedPage, pageSize: parsedSize };
}

export const skipTake = ({ page, pageSize }: PageRequest) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

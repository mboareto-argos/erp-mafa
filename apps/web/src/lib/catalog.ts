// Produto como a API devolve em GET /catalog/products (lista completa) e a
// busca usada nos fluxos de venda e compra.

export type CatalogProduct = {
  id: string;
  name: string;
  sku: string;
  status: string;
  variants: { id: string }[];
  prices: { salePrice: string }[];
};

/** Busca sem acento/caixa por nome ou SKU; SKU exato vem primeiro. */
export function searchProducts(products: CatalogProduct[], query: string) {
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const q = normalize(query);
  const active = products.filter(
    (product) => product.status === 'active' && product.variants[0],
  );
  if (!q) return active;
  const terms = q.split(/\s+/);
  return active
    .filter((product) => {
      const haystack = `${normalize(product.name)} ${normalize(product.sku)}`;
      return terms.every((term) => haystack.includes(term));
    })
    .sort(
      (a, b) => Number(normalize(b.sku) === q) - Number(normalize(a.sku) === q),
    );
}

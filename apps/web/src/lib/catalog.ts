// Produto como a API devolve em GET /catalog/products (lista completa) e a
// busca usada nos fluxos de venda, compra e consulta.

export type CatalogProduct = {
  id: string;
  name: string;
  sku: string;
  status: string;
  imageUrl?: string | null;
  variants: { id: string; barcode?: string | null }[];
  prices: { salePrice: string }[];
};

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Formas equivalentes de um mesmo código numérico: leitores diferentes
 * devolvem o UPC-A de 12 dígitos ou o mesmo número como EAN-13 com um zero
 * à esquerda.
 */
function codeVariants(code: string) {
  const clean = code.trim().toUpperCase();
  const forms = new Set([clean]);
  if (/^\d{12}$/.test(clean)) forms.add(`0${clean}`);
  if (/^0\d{12}$/.test(clean)) forms.add(clean.slice(1));
  return forms;
}

/** Produto ativo cujo código de barras ou SKU é exatamente o código lido. */
export function findByCode(products: CatalogProduct[], code: string) {
  const forms = codeVariants(code);
  if (forms.has('')) return undefined;
  const active = products.filter(
    (product) => product.status === 'active' && product.variants[0],
  );
  return (
    active.find((product) =>
      product.variants.some(
        (variant) =>
          variant.barcode && forms.has(variant.barcode.trim().toUpperCase()),
      ),
    ) ?? active.find((product) => forms.has(product.sku.trim().toUpperCase()))
  );
}

/** Busca sem acento/caixa por nome, SKU ou código de barras; código exato vem primeiro. */
export function searchProducts(products: CatalogProduct[], query: string) {
  const q = normalize(query);
  const active = products.filter(
    (product) => product.status === 'active' && product.variants[0],
  );
  if (!q) return active;
  const exact = findByCode(active, query);
  const terms = q.split(/\s+/);
  const matches = active.filter((product) => {
    const codes = product.variants
      .map((variant) => variant.barcode ?? '')
      .join(' ');
    const haystack = `${normalize(product.name)} ${normalize(product.sku)} ${normalize(codes)}`;
    return terms.every((term) => haystack.includes(term));
  });
  if (exact && !matches.includes(exact)) matches.unshift(exact);
  return exact
    ? [exact, ...matches.filter((product) => product !== exact)]
    : matches;
}

export function primaryBarcode(product: CatalogProduct) {
  return product.variants[0]?.barcode ?? null;
}

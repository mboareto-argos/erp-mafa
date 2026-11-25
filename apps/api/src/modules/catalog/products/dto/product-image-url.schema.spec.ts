import { isAllowedProductImageUrl } from './product-image-url.schema';

describe('isAllowedProductImageUrl (ADR-0003)', () => {
  it('aceita o Vercel Blob público do app (https) e /uploads/ do ambiente local', () => {
    expect(
      isAllowedProductImageUrl(
        'https://abc123.public.blob.vercel-storage.com/companies/c/products/p/x.jpg',
      ),
    ).toBe(true);
    expect(
      isAllowedProductImageUrl('/uploads/companies/c/products/p/x.jpg'),
    ).toBe(true);
  });

  it('recusa qualquer outra origem', () => {
    for (const url of [
      'https://exemplo.com/foto.jpg',
      'https://public.blob.vercel-storage.com.evil.com/x.jpg',
      'http://abc123.public.blob.vercel-storage.com/x.jpg',
      'javascript:alert(1)',
      '/uploads/../../etc/passwd',
      '//evil.com/x.jpg',
      'data:image/png;base64,AAAA',
    ])
      expect(isAllowedProductImageUrl(url)).toBe(false);
  });
});

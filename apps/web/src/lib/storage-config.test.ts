import { describe, expect, it } from 'vitest';
import { blobConfigured } from './storage-config';

describe('blobConfigured', () => {
  it('aceita o formato novo do Vercel (BLOB_STORE_ID, autenticação OIDC)', () => {
    expect(blobConfigured({ BLOB_STORE_ID: 'store_abc123' })).toBe(true);
  });

  it('aceita o formato antigo (BLOB_READ_WRITE_TOKEN)', () => {
    expect(blobConfigured({ BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_x' })).toBe(
      true,
    );
  });

  it('sem nenhum dos dois (ou vazio), não está configurado', () => {
    expect(blobConfigured({})).toBe(false);
    expect(blobConfigured({ BLOB_STORE_ID: '  ' })).toBe(false);
  });
});

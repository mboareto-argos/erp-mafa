import { z } from 'zod';

// Origem aceita para a foto do produto (ADR-0003):
// - Vercel Blob público do app: https://<store>.public.blob.vercel-storage.com/...
// - ambiente local sem Blob: arquivo servido pelo próprio web em /uploads/...
// Qualquer outra URL é recusada, para não virar um link externo arbitrário
// guardado no cadastro.
const BLOB_HOST = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i;

export function isAllowedProductImageUrl(value: string) {
  if (/^\/uploads\/[\w./-]+$/.test(value) && !value.includes('..')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && BLOB_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

export const productImageUrlSchema = z
  .string()
  .max(500)
  .refine(
    isAllowedProductImageUrl,
    'Foto inválida: envie a imagem pelo próprio sistema.',
  );

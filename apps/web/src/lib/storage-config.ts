/**
 * O Blob está disponível quando o projeto web tem um store conectado, em
 * qualquer um dos dois formatos que o Vercel cria ao conectar:
 * - novo: BLOB_STORE_ID — o SDK autentica sozinho com o token OIDC do
 *   próprio deploy (VERCEL_OIDC_TOKEN);
 * - antigo: BLOB_READ_WRITE_TOKEN.
 */
export function blobConfigured(
  env: Record<string, string | undefined> = process.env,
) {
  return Boolean(
    env.BLOB_STORE_ID?.trim() || env.BLOB_READ_WRITE_TOKEN?.trim(),
  );
}

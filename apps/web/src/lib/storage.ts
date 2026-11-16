import 'server-only';

import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { del, put } from '@vercel/blob';

// Armazenamento de arquivos do app (ADR-0003).
// - Produção: Vercel Blob público (precisa de BLOB_READ_WRITE_TOKEN no
//   projeto web do Vercel — criado ao conectar um Blob store).
// - Desenvolvimento local sem token: grava em public/uploads/ e serve pelo
//   próprio Next. Nunca usado no Vercel (lá o disco é só leitura).

const LOCAL_ROOT = join(process.cwd(), 'public', 'uploads');

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      'O armazenamento de fotos não está configurado. Conecte um Blob store ao projeto web no Vercel.',
    );
  }
}

function blobEnabled() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL) throw new StorageNotConfiguredError();
  return false;
}

/** Grava o arquivo e devolve a URL pública. `path` sem barra inicial. */
export async function saveFile(path: string, data: Blob, contentType: string) {
  if (blobEnabled()) {
    const blob = await put(path, data, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return blob.url;
  }
  const target = normalize(join(LOCAL_ROOT, path));
  if (!target.startsWith(LOCAL_ROOT))
    throw new Error('Caminho de arquivo inválido.');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await data.arrayBuffer()));
  return `/uploads/${path}`;
}

/** Apaga um arquivo salvo por saveFile. Nunca falha a operação principal. */
export async function deleteFile(url: string | null | undefined) {
  if (!url) return;
  try {
    if (url.startsWith('/uploads/')) {
      const target = normalize(join(LOCAL_ROOT, url.slice('/uploads/'.length)));
      if (target.startsWith(LOCAL_ROOT)) await unlink(target);
      return;
    }
    if (blobEnabled() && /\.public\.blob\.vercel-storage\.com\//.test(url))
      await del(url);
  } catch {
    // arquivo órfão é aceitável; não pode impedir a troca da foto
  }
}

import { NextResponse } from 'next/server';
import {
  ApiRequestError,
  backendAuthenticatedRequest,
  getSession,
} from '@/lib/session';
import { deleteFile, saveFile, StorageNotConfiguredError } from '@/lib/storage';

// Foto principal do produto (ADR-0003). O web grava o arquivo e a API
// guarda a URL. Antes de gravar: sessão, permissão manage_catalog e o
// produto precisa existir para a empresa do usuário (a API consulta com o
// token dele — RLS). A API ainda valida a URL ao salvar.

const MAX_BYTES = 3 * 1024 * 1024; // a foto chega reduzida pelo navegador (~200–400 KB)
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/png': 'png',
};

type Session = { permissions: string[]; company: { id: string } };
type Product = { id: string; imageUrl?: string | null };

async function authorize(id: string) {
  const session = (await getSession()) as Session | null;
  if (!session)
    throw new ApiRequestError(401, 'Sessão expirada. Faça login novamente.');
  if (!session.permissions.includes('manage_catalog'))
    throw new ApiRequestError(
      403,
      'Você não tem permissão para alterar fotos de produtos.',
    );
  const product = (await backendAuthenticatedRequest(
    `/catalog/products/${id}`,
  )) as Product;
  return { session, product };
}

function failure(error: unknown, fallback: string) {
  const status =
    error instanceof ApiRequestError
      ? error.status
      : error instanceof StorageNotConfiguredError
        ? 503
        : 502;
  return NextResponse.json(
    { message: error instanceof Error ? error.message : fallback },
    { status },
  );
}

export async function POST(
  request: Request,
  context: RouteContext<'/api/catalog/products/[id]/image'>,
) {
  const { id } = await context.params;
  try {
    const { session, product } = await authorize(id);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof Blob) || file.size === 0)
      return NextResponse.json({ message: 'Envie uma foto.' }, { status: 400 });
    const extension = TYPES[file.type];
    if (!extension)
      return NextResponse.json(
        { message: 'Formato não suportado. Use JPG, PNG ou WebP.' },
        { status: 415 },
      );
    if (file.size > MAX_BYTES)
      return NextResponse.json(
        { message: 'Foto muito grande (máximo 3 MB).' },
        { status: 413 },
      );

    const path = `companies/${session.company.id}/products/${product.id}/${crypto.randomUUID()}.${extension}`;
    const imageUrl = await saveFile(path, file, file.type);
    try {
      await backendAuthenticatedRequest(`/catalog/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ imageUrl }),
      });
    } catch (error) {
      await deleteFile(imageUrl);
      throw error;
    }
    await deleteFile(product.imageUrl);
    return NextResponse.json({ imageUrl });
  } catch (error) {
    return failure(error, 'Não foi possível salvar a foto.');
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/catalog/products/[id]/image'>,
) {
  const { id } = await context.params;
  try {
    const { product } = await authorize(id);
    await backendAuthenticatedRequest(`/catalog/products/${product.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ imageUrl: null }),
    });
    await deleteFile(product.imageUrl);
    return NextResponse.json({ imageUrl: null });
  } catch (error) {
    return failure(error, 'Não foi possível remover a foto.');
  }
}

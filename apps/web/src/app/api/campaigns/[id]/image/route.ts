import { NextResponse } from 'next/server';
import {
  ApiRequestError,
  backendAuthenticatedRequest,
  getSession,
} from '@/lib/session';
import { deleteFile, saveFile, StorageNotConfiguredError } from '@/lib/storage';

// Foto da campanha (BR §10.9, regra 10; ADR-0003): o web grava o arquivo e
// a API guarda a URL (e valida a origem). Antes de gravar: sessão,
// manage_customers e a campanha precisa existir para a empresa do usuário.

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/png': 'png',
};

type Session = { permissions: string[]; company: { id: string } };
type Campaign = { id: string; imageUrl?: string | null };

async function authorize(id: string) {
  const session = (await getSession()) as Session | null;
  if (!session)
    throw new ApiRequestError(401, 'Sessão expirada. Faça login novamente.');
  if (!session.permissions.includes('manage_customers'))
    throw new ApiRequestError(
      403,
      'Você não tem permissão para alterar campanhas.',
    );
  const campaign = (await backendAuthenticatedRequest(
    `/campaigns/${id}`,
  )) as Campaign;
  return { session, campaign };
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
  context: RouteContext<'/api/campaigns/[id]/image'>,
) {
  const { id } = await context.params;
  try {
    const { session, campaign } = await authorize(id);
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

    const path = `companies/${session.company.id}/campaigns/${campaign.id}/${crypto.randomUUID()}.${extension}`;
    const imageUrl = await saveFile(path, file, file.type);
    try {
      await backendAuthenticatedRequest(`/campaigns/${campaign.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ imageUrl }),
      });
    } catch (error) {
      await deleteFile(imageUrl);
      throw error;
    }
    await deleteFile(campaign.imageUrl);
    return NextResponse.json({ imageUrl });
  } catch (error) {
    return failure(error, 'Não foi possível salvar a foto.');
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/campaigns/[id]/image'>,
) {
  const { id } = await context.params;
  try {
    const { campaign } = await authorize(id);
    await backendAuthenticatedRequest(`/campaigns/${campaign.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ imageUrl: null }),
    });
    await deleteFile(campaign.imageUrl);
    return NextResponse.json({ imageUrl: null });
  } catch (error) {
    return failure(error, 'Não foi possível remover a foto.');
  }
}

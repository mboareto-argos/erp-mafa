import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';

// Kit (BR §10.3, regras 11 a 13). Só repassa: permissão (view/manage_catalog)
// e isolamento por empresa são da API (TA-SEC-001).
const validId = (id: string) => /^[0-9a-f-]{36}$/.test(id);

function failure(error: unknown, fallback: string) {
  return NextResponse.json(
    { message: error instanceof Error ? error.message : fallback },
    { status: error instanceof ApiRequestError ? error.status : 502 },
  );
}

export async function GET(
  _request: Request,
  context: RouteContext<'/api/kits/[id]'>,
) {
  const { id } = await context.params;
  if (!validId(id))
    return NextResponse.json({ message: 'Kit inválido.' }, { status: 404 });
  try {
    return NextResponse.json(await backendAuthenticatedRequest(`/kits/${id}`));
  } catch (error) {
    return failure(error, 'Não foi possível carregar o kit.');
  }
}

export async function PUT(
  request: Request,
  context: RouteContext<'/api/kits/[id]'>,
) {
  const { id } = await context.params;
  if (!validId(id))
    return NextResponse.json({ message: 'Kit inválido.' }, { status: 404 });
  try {
    return NextResponse.json(
      await backendAuthenticatedRequest(`/kits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(await request.json()),
      }),
    );
  } catch (error) {
    return failure(error, 'Não foi possível salvar o kit.');
  }
}

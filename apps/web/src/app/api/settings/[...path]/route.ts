import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';

const allowed = [
  /^company$/,
  /^company\/profit-distribution$/,
  /^users$/,
  /^users\/invitations$/,
  /^users\/[0-9a-f-]{36}$/,
  /^catalog\/(categories|brands)$/,
  /^catalog\/(categories|brands)\/[0-9a-f-]{36}(?:\/(?:deactivate|reactivate))?$/,
];

type SettingsContext = { params: Promise<{ path: string[] }> };

async function forward(
  request: Request,
  context: SettingsContext,
  method: 'GET' | 'POST' | 'PATCH',
) {
  const target = (await context.params).path.join('/');
  if (!allowed.some((pattern) => pattern.test(target)))
    return NextResponse.json(
      { message: 'Recurso de configuração inválido.' },
      { status: 404 },
    );
  try {
    const body =
      method === 'GET'
        ? undefined
        : JSON.stringify(await request.json().catch(() => ({})));
    return NextResponse.json(
      await backendAuthenticatedRequest(`/${target}`, { method, body }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a configuração.',
      },
      { status: error instanceof ApiRequestError ? error.status : 502 },
    );
  }
}

export function GET(request: Request, context: SettingsContext) {
  return forward(request, context, 'GET');
}
export function POST(request: Request, context: SettingsContext) {
  return forward(request, context, 'POST');
}
export function PATCH(request: Request, context: SettingsContext) {
  return forward(request, context, 'PATCH');
}

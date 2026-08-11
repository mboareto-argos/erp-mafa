import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';
type Context = { params: Promise<{ path: string[] }> };
async function forward(
  request: Request,
  context: Context,
  method: 'GET' | 'POST' | 'PATCH',
) {
  const path = (await context.params).path.join('/');
  if (!/^(?:[0-9a-f-]{36}(?:\/complete)?)?$/.test(path))
    return NextResponse.json(
      { message: 'Inventário inválido.' },
      { status: 404 },
    );
  try {
    return NextResponse.json(
      await backendAuthenticatedRequest(
        `/inventory/counts${path ? `/${path}` : ''}`,
        {
          method,
          body:
            method === 'GET'
              ? undefined
              : JSON.stringify(await request.json().catch(() => ({}))),
        },
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível concluir o inventário.',
      },
      { status: error instanceof ApiRequestError ? error.status : 502 },
    );
  }
}
export function GET(r: Request, c: Context) {
  return forward(r, c, 'GET');
}
export function POST(r: Request, c: Context) {
  return forward(r, c, 'POST');
}
export function PATCH(r: Request, c: Context) {
  return forward(r, c, 'PATCH');
}

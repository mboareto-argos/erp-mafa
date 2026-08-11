import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';

export async function GET(
  _request: Request,
  context: RouteContext<'/api/customers/[id]'>,
) {
  const { id } = await context.params;
  try {
    return NextResponse.json(
      await backendAuthenticatedRequest(`/customers/${id}`),
    );
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o cliente.',
      },
      { status },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/customers/[id]'>,
) {
  const { id } = await context.params;
  try {
    return NextResponse.json(
      await backendAuthenticatedRequest(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(await request.json()),
      }),
    );
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 502;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível editar o cliente.',
      },
      { status },
    );
  }
}

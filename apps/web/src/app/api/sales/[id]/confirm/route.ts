import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';
export async function POST(
  request: Request,
  context: RouteContext<'/api/sales/[id]/confirm'>,
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      await backendAuthenticatedRequest(`/sales/${id}/confirm`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': request.headers.get('Idempotency-Key') ?? '',
        },
        body: JSON.stringify(await request.json()),
      }),
    );
  } catch (e) {
    return NextResponse.json(
      {
        message:
          e instanceof Error
            ? e.message
            : 'Não foi possível confirmar a venda.',
      },
      { status: e instanceof ApiRequestError ? e.status : 502 },
    );
  }
}

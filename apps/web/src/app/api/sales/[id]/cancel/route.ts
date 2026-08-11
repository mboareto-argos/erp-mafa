import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';

export async function POST(
  request: Request,
  context: RouteContext<'/api/sales/[id]/cancel'>,
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      await backendAuthenticatedRequest(`/sales/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': request.headers.get('Idempotency-Key') ?? '',
        },
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível cancelar a venda.',
      },
      { status: error instanceof ApiRequestError ? error.status : 502 },
    );
  }
}

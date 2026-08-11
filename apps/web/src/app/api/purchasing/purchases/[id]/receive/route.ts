import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';

export async function POST(
  request: Request,
  context: RouteContext<'/api/purchasing/purchases/[id]/receive'>,
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      await backendAuthenticatedRequest(`/purchasing/purchases/${id}/receive`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': request.headers.get('Idempotency-Key') ?? '',
        },
        body: JSON.stringify(await request.json()),
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível receber a compra.',
      },
      { status: error instanceof ApiRequestError ? error.status : 502 },
    );
  }
}

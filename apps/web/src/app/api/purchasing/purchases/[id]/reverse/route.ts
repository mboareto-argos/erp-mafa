import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      await backendAuthenticatedRequest(`/purchasing/purchases/${id}/reverse`, {
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
            : 'Não foi possível estornar o recebimento.',
      },
      { status: error instanceof ApiRequestError ? error.status : 502 },
    );
  }
}

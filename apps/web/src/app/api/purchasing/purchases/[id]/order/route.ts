import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';

export async function POST(
  _request: Request,
  context: RouteContext<'/api/purchasing/purchases/[id]/order'>,
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      await backendAuthenticatedRequest(`/purchasing/purchases/${id}/order`, {
        method: 'POST',
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível confirmar a compra.',
      },
      { status: error instanceof ApiRequestError ? error.status : 502 },
    );
  }
}

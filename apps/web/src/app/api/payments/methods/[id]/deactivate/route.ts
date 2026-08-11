import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';
export async function PATCH(
  _: Request,
  context: RouteContext<'/api/payments/methods/[id]/deactivate'>,
) {
  const { id } = await context.params;
  try {
    return NextResponse.json(
      await backendAuthenticatedRequest(`/payments/methods/${id}/deactivate`, {
        method: 'PATCH',
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível inativar a forma de pagamento.',
      },
      { status: error instanceof ApiRequestError ? error.status : 502 },
    );
  }
}

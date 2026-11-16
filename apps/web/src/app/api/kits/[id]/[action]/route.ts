import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';

// Montar/desmontar kit (BR §10.3, regras 12 e 13). A permissão
// (adjust_stock) e o isolamento por empresa são da API (TA-SEC-001).
const ACTIONS = new Set(['assemble', 'disassemble']);

export async function POST(
  request: Request,
  context: RouteContext<'/api/kits/[id]/[action]'>,
) {
  const { id, action } = await context.params;
  if (!ACTIONS.has(action) || !/^[0-9a-f-]{36}$/.test(id))
    return NextResponse.json(
      { message: 'Operação inválida.' },
      { status: 404 },
    );
  try {
    const key = request.headers.get('Idempotency-Key');
    return NextResponse.json(
      await backendAuthenticatedRequest(`/kits/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(await request.json()),
        headers: key ? { 'Idempotency-Key': key } : undefined,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível concluir a operação.',
      },
      { status: error instanceof ApiRequestError ? error.status : 502 },
    );
  }
}

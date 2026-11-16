import { NextResponse } from 'next/server';
import { ApiRequestError, backendAuthenticatedRequest } from '@/lib/session';

// Operações de saldo da conta (BR §10.13 regras 8–10). Só repassa para a
// API — a autorização (manage_financial_accounts) e o isolamento por
// empresa são da API (TA-SEC-001).
const ACTIONS = new Set(['opening-balance', 'reconcile', 'owner-contribution']);

export async function POST(
  request: Request,
  context: RouteContext<'/api/financial-accounts/[id]/[action]'>,
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
      await backendAuthenticatedRequest(`/financial-accounts/${id}/${action}`, {
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

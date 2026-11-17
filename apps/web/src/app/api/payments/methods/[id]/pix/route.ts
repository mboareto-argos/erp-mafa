import { forward, isUuid, notFound } from '@/lib/api-proxy';

// Chave Pix da forma de pagamento (BR §10.12, regra 8).
export async function PUT(
  request: Request,
  context: RouteContext<'/api/payments/methods/[id]/pix'>,
) {
  const { id } = await context.params;
  if (!isUuid(id)) return notFound('Forma de pagamento não encontrada.');
  return forward(
    `/payments/methods/${id}/pix`,
    { method: 'PUT', body: JSON.stringify(await request.json()) },
    'Não foi possível salvar a chave Pix.',
  );
}

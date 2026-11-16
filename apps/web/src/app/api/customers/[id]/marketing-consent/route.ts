import { forward, isUuid, notFound } from '@/lib/api-proxy';

// Aceite/saída de ofertas (BR §10.9, regra 9).
export async function PUT(
  request: Request,
  context: RouteContext<'/api/customers/[id]/marketing-consent'>,
) {
  const { id } = await context.params;
  if (!isUuid(id)) return notFound('Cliente não encontrado.');
  return forward(
    `/customers/${id}/marketing-consent`,
    { method: 'PUT', body: JSON.stringify(await request.json()) },
    'Não foi possível salvar o aceite de ofertas.',
  );
}

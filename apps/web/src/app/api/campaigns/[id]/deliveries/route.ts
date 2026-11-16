import { forward, isUuid, notFound } from '@/lib/api-proxy';

// Marca "enviado" para um cliente (BR §10.9, regra 11).
export async function POST(
  request: Request,
  context: RouteContext<'/api/campaigns/[id]/deliveries'>,
) {
  const { id } = await context.params;
  if (!isUuid(id)) return notFound('Campanha não encontrada.');
  return forward(
    `/campaigns/${id}/deliveries`,
    { method: 'POST', body: JSON.stringify(await request.json()) },
    'Não foi possível marcar o envio.',
  );
}

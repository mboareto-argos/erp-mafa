import { forward, isUuid, notFound } from '@/lib/api-proxy';

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/campaigns/[id]'>,
) {
  const { id } = await context.params;
  if (!isUuid(id)) return notFound('Campanha não encontrada.');
  return forward(
    `/campaigns/${id}`,
    { method: 'PATCH', body: JSON.stringify(await request.json()) },
    'Não foi possível salvar a campanha.',
  );
}

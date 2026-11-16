import { forward, isUuid, notFound } from '@/lib/api-proxy';

export async function PATCH(
  _request: Request,
  context: RouteContext<'/api/campaigns/[id]/archive'>,
) {
  const { id } = await context.params;
  if (!isUuid(id)) return notFound('Campanha não encontrada.');
  return forward(
    `/campaigns/${id}/archive`,
    { method: 'PATCH' },
    'Não foi possível arquivar a campanha.',
  );
}

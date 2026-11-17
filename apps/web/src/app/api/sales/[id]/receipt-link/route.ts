import { forward, isUuid, notFound } from '@/lib/api-proxy';

// Link do recibo da venda (BR §10.10, regra 26); { rotate: true } gera outro.
export async function POST(
  request: Request,
  context: RouteContext<'/api/sales/[id]/receipt-link'>,
) {
  const { id } = await context.params;
  if (!isUuid(id)) return notFound('Venda não encontrada.');
  return forward(
    `/sales/${id}/receipt-link`,
    { method: 'POST', body: JSON.stringify(await request.json()) },
    'Não foi possível gerar o link do recibo.',
  );
}

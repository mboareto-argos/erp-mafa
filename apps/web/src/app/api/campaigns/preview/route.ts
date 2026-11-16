import { forward } from '@/lib/api-proxy';

// Quantos clientes o público alcança (BR §10.9, regra 10).
export async function POST(request: Request) {
  return forward(
    '/campaigns/preview',
    { method: 'POST', body: JSON.stringify(await request.json()) },
    'Não foi possível calcular o público.',
  );
}

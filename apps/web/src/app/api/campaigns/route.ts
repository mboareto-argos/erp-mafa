import { forward } from '@/lib/api-proxy';

export async function POST(request: Request) {
  return forward(
    '/campaigns',
    { method: 'POST', body: JSON.stringify(await request.json()) },
    'Não foi possível criar a campanha.',
  );
}

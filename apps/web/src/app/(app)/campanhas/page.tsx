import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Megaphone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { audienceText, type CampaignAudience } from '@/lib/campaigns';
import { backendAuthenticatedRequest, getSession } from '@/lib/session';

type CampaignRow = {
  id: string;
  title: string;
  audience: CampaignAudience;
  audienceBrand?: { name: string } | null;
  audienceInactiveDays?: number | null;
  createdAt: string;
  _count: { deliveries: number };
};

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));

// Campanhas (BR §10.9, regras 9 a 12): ofertas, promoções e datas
// especiais enviadas 1 a 1 pelo WhatsApp do usuário, só para quem aceitou.
export default async function CampaignsPage() {
  const session = (await getSession()) as { permissions: string[] } | null;
  const permissions = session?.permissions ?? [];
  if (!permissions.includes('view_customers')) redirect('/inicio');
  const canManage = permissions.includes('manage_customers');
  const campaigns = (await backendAuthenticatedRequest(
    '/campaigns',
  )) as CampaignRow[];

  return (
    <main className="page-content grid max-w-3xl gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Campanhas</h1>
          <p className="text-sm text-neutral-500">
            Promoções e datas especiais pelo seu WhatsApp, só para quem aceitou
            receber ofertas.
          </p>
        </div>
        {canManage && (
          <Button asChild size="lg">
            <Link href="/campanhas/nova">
              <Plus aria-hidden="true" />
              Nova campanha
            </Link>
          </Button>
        )}
      </div>

      {campaigns.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-0 p-8 text-center">
          <Megaphone
            className="size-8 text-brand-accent-hover"
            aria-hidden="true"
          />
          <strong className="text-neutral-900">Nenhuma campanha ainda</strong>
          <p className="max-w-sm text-sm text-neutral-500">
            Monte uma mensagem com foto, escolha quem recebe (aniversariantes,
            quem comprou uma marca…) e envie um a um pelo WhatsApp.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link
                href={`/campanhas/${campaign.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-0 p-4 hover:border-brand-accent focus-visible:outline-2 focus-visible:outline-brand-accent"
              >
                <span className="min-w-0">
                  <strong className="block truncate text-md font-semibold text-neutral-900">
                    {campaign.title}
                  </strong>
                  <span className="block truncate text-sm text-neutral-500">
                    {audienceText(campaign)} · {dateLabel(campaign.createdAt)}
                  </span>
                </span>
                <span className="shrink-0 rounded-sm bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700">
                  {campaign._count.deliveries}{' '}
                  {campaign._count.deliveries === 1 ? 'enviada' : 'enviadas'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

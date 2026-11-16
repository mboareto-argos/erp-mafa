import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import {
  CampaignSender,
  type CampaignRecipient,
} from '@/components/campaigns/campaign-sender';
import {
  audienceText,
  personalize,
  type CampaignAudience,
} from '@/lib/campaigns';
import {
  ApiRequestError,
  backendAuthenticatedRequest,
  getSession,
} from '@/lib/session';

type CampaignDetail = {
  id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  audience: CampaignAudience;
  audienceBrand?: { name: string } | null;
  audienceInactiveDays?: number | null;
  recipients: CampaignRecipient[];
  withoutPhone: number;
};

// Campanha pronta para enviar (BR §10.9, regras 10 e 11).
export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = (await getSession()) as { permissions: string[] } | null;
  const permissions = session?.permissions ?? [];
  if (!permissions.includes('view_customers')) redirect('/inicio');
  const { id } = await params;
  const campaign = await (
    backendAuthenticatedRequest(`/campaigns/${id}`) as Promise<CampaignDetail>
  ).catch((error: unknown) => {
    if (
      error instanceof ApiRequestError &&
      (error.status === 404 || error.status === 400)
    )
      notFound();
    throw error;
  });

  return (
    <main className="page-content grid max-w-3xl gap-4">
      <Link
        href="/campanhas"
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Campanhas
      </Link>

      <article className="grid min-w-0 grid-cols-1 gap-4 rounded-lg border border-neutral-100 bg-neutral-0 p-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:p-6">
        {campaign.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- foto da campanha (Blob público ou /uploads local)
          <img
            src={campaign.imageUrl}
            alt="Foto da campanha"
            className="max-h-72 w-full rounded-md bg-neutral-50 object-contain"
          />
        )}
        <div className="grid min-w-0 content-start gap-2">
          <p className="text-xs font-semibold tracking-wide text-brand-accent-hover uppercase">
            {audienceText(campaign)}
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {campaign.title}
          </h1>
          <p className="rounded-md bg-neutral-25 p-3 text-sm whitespace-pre-wrap text-neutral-900">
            {personalize(campaign.message, 'Ana')}
          </p>
          <p className="text-xs text-neutral-500">
            Prévia com o nome “Ana”; cada cliente recebe com o próprio nome.
          </p>
        </div>
      </article>

      <CampaignSender
        campaignId={campaign.id}
        message={campaign.message}
        imageUrl={campaign.imageUrl}
        recipients={campaign.recipients}
        withoutPhone={campaign.withoutPhone}
        canManage={permissions.includes('manage_customers')}
      />
    </main>
  );
}

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import {
  CampaignForm,
  type CampaignFormValues,
} from '@/components/campaigns/campaign-form';
import {
  ApiRequestError,
  backendAuthenticatedRequest,
  getSession,
} from '@/lib/session';

type Brand = { id: string; name: string; status?: string };

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = (await getSession()) as { permissions: string[] } | null;
  const permissions = session?.permissions ?? [];
  if (!permissions.includes('manage_customers')) redirect('/campanhas');
  const { id } = await params;
  const [campaign, brands] = await Promise.all([
    (
      backendAuthenticatedRequest(
        `/campaigns/${id}`,
      ) as Promise<CampaignFormValues>
    ).catch((error: unknown) => {
      if (
        error instanceof ApiRequestError &&
        (error.status === 404 || error.status === 400)
      )
        notFound();
      throw error;
    }),
    permissions.includes('view_catalog')
      ? (
          backendAuthenticatedRequest('/catalog/brands') as Promise<Brand[]>
        ).catch(() => [] as Brand[])
      : Promise.resolve([] as Brand[]),
  ]);

  return (
    <main className="page-content grid max-w-2xl gap-4">
      <Link
        href={`/campanhas/${id}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Voltar à campanha
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900">
        Editar campanha
      </h1>
      <CampaignForm
        initial={{
          id,
          title: campaign.title,
          message: campaign.message,
          imageUrl: campaign.imageUrl,
          audience: campaign.audience,
          audienceBrandId: campaign.audienceBrandId,
          audienceInactiveDays: campaign.audienceInactiveDays,
        }}
        brands={brands.filter(
          (brand) =>
            brand.status !== 'inactive' ||
            brand.id === campaign.audienceBrandId,
        )}
      />
    </main>
  );
}

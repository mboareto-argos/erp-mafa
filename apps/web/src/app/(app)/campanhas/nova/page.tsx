import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { CampaignForm } from '@/components/campaigns/campaign-form';
import { backendAuthenticatedRequest, getSession } from '@/lib/session';

type Brand = { id: string; name: string; status?: string };

export default async function NewCampaignPage() {
  const session = (await getSession()) as { permissions: string[] } | null;
  const permissions = session?.permissions ?? [];
  // Sem permissão a tela nem existe (DS-PERM-001); a API valida de novo.
  if (!permissions.includes('manage_customers')) redirect('/campanhas');
  const brands = permissions.includes('view_catalog')
    ? (
        (await backendAuthenticatedRequest('/catalog/brands').catch(
          () => [],
        )) as Brand[]
      ).filter((brand) => brand.status !== 'inactive')
    : [];

  return (
    <main className="page-content grid max-w-2xl gap-4">
      <Link
        href="/campanhas"
        className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-neutral-900"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Campanhas
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900">Nova campanha</h1>
      <CampaignForm brands={brands} />
    </main>
  );
}

import Link from 'next/link';
import {
  CatalogSettings,
  type CatalogSetting,
} from '@/components/settings/catalog-settings';
import { CompanySettings } from '@/components/settings/company-settings';
import { TeamSettings } from '@/components/settings/team-settings';
import { ProfitDistributionSettings } from '@/components/settings/profit-distribution-settings';
import { backendAuthenticatedRequest, getSession } from '@/lib/session';

type Session = {
  user: { id: string };
  roleName: string;
  permissions: string[];
};
type Company = Parameters<typeof CompanySettings>[0]['company'];
type Team = Parameters<typeof TeamSettings>[0] extends {
  initialMemberships: infer M;
  initialInvitations: infer I;
  roles: infer R;
}
  ? { memberships: M; invitations: I; roles: R }
  : never;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = 'catalog' } = await searchParams;
  const session = (await getSession()) as Session;
  const canViewCompany = session.permissions.includes('view_company_settings');
  const canManageCompany = session.permissions.includes(
    'manage_company_settings',
  );
  const canManageUsers = session.permissions.includes('manage_users');
  const canViewCatalog = session.permissions.includes('view_catalog');
  const canManageCatalog = session.permissions.includes('manage_catalog');
  const validTabs = [
    { id: 'catalog', label: 'Catálogo', visible: canViewCatalog },
    { id: 'company', label: 'Empresa', visible: canViewCompany },
    { id: 'team', label: 'Equipe', visible: canManageUsers },
  ].filter((item) => item.visible);
  const active = validTabs.some((item) => item.id === tab)
    ? tab
    : validTabs[0]?.id;
  const [categories, brands, company, team, policies] = await Promise.all([
    active === 'catalog'
      ? (backendAuthenticatedRequest('/catalog/categories') as Promise<
          CatalogSetting[]
        >)
      : Promise.resolve([]),
    active === 'catalog'
      ? (backendAuthenticatedRequest('/catalog/brands') as Promise<
          CatalogSetting[]
        >)
      : Promise.resolve([]),
    active === 'company'
      ? (backendAuthenticatedRequest('/company') as Promise<Company>)
      : Promise.resolve(undefined),
    active === 'team'
      ? (backendAuthenticatedRequest('/users') as Promise<Team>)
      : Promise.resolve(undefined),
    active === 'company'
      ? (backendAuthenticatedRequest('/company/profit-distribution') as Promise<
          Array<{
            effectiveFrom: string;
            reinvestmentRate: string;
            proLaboreRate: string;
            reserveRate: string;
            marketingRate: string;
          }>
        >)
      : Promise.resolve([]),
  ]);
  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h1>Configurações</h1>
          <p>Organize cadastros, políticas da empresa e acessos da equipe.</p>
        </div>
      </div>
      <nav
        className="finance-tabs settings-tabs"
        aria-label="Seções de configurações"
      >
        {validTabs.map((item) => (
          <Link
            key={item.id}
            href={`/configuracoes?tab=${item.id}`}
            aria-current={active === item.id ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {active === 'catalog' && (
        <CatalogSettings
          categories={categories}
          brands={brands}
          canManage={canManageCatalog}
        />
      )}
      {active === 'company' && company && (
        <div className="settings-company-stack">
          <section className="data-card settings-company-card">
            <CompanySettings company={company} canManage={canManageCompany} />
          </section>
          <section className="data-card settings-company-card">
            <ProfitDistributionSettings
              policy={policies[0]}
              canManage={canManageCompany}
            />
          </section>
        </div>
      )}
      {active === 'team' && team && (
        <TeamSettings
          initialMemberships={team.memberships}
          initialInvitations={team.invitations}
          roles={team.roles}
          currentUserId={session.user.id}
          currentRole={session.roleName}
        />
      )}
    </main>
  );
}

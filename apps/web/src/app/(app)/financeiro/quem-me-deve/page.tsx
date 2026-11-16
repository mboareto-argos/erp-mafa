import { redirect } from 'next/navigation';
import { DebtorsView } from '@/components/finance/debtors/debtors-view';
import {
  groupDebtors,
  todayIn,
  type ReceivableItem,
} from '@/components/finance/debtors/debtors';
import { backendAuthenticatedRequest, getSession } from '@/lib/session';

type Session = { permissions: string[]; company: { name: string } };
type Account = { id: string; name: string; status?: string; kind?: string };

const optional = <T,>(request: Promise<unknown>, fallback: T) =>
  (request as Promise<T>).catch(() => fallback);

export default async function DebtorsPage() {
  const session = (await getSession()) as Session | null;
  const permissions = session?.permissions ?? [];
  if (!permissions.includes('view_receivables')) redirect('/inicio');
  const canReceive = permissions.includes('manage_receivables');

  const [receivables, accounts, company] = await Promise.all([
    backendAuthenticatedRequest('/receivables') as Promise<ReceivableItem[]>,
    canReceive
      ? optional<Account[]>(
          backendAuthenticatedRequest('/financial-accounts'),
          [],
        )
      : Promise.resolve([] as Account[]),
    optional<{ timezone?: string } | null>(
      backendAuthenticatedRequest('/company'),
      null,
    ),
  ]);
  // "Hoje" no fuso da loja: o servidor (Vercel) roda em UTC e erraria o dia
  // entre 21h e meia-noite no Brasil.
  const today = todayIn(company?.timezone ?? 'America/Sao_Paulo');

  return (
    <DebtorsView
      debtors={groupDebtors(receivables, today)}
      today={today}
      companyName={session?.company.name ?? ''}
      accounts={accounts
        // Dinheiro de cliente entra numa conta da loja, nunca no "meu bolso".
        .filter(
          (account) =>
            (!account.status || account.status === 'active') &&
            account.kind !== 'owner',
        )
        .map(({ id, name }) => ({ id, name }))}
      canReceive={canReceive}
      canSell={permissions.includes('manage_sales')}
    />
  );
}

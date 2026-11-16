import { toCents } from '@/lib/money';

// "Dinheiro da loja" (BR §10.13 regra 11) e o que a loja deve ao
// proprietário (regra 10), em centavos.

export type MoneyAccount = {
  id: string;
  name: string;
  kind: 'store' | 'owner';
  status: string;
  balance: string;
  hasOpeningBalance: boolean;
};

export function summarizeAccounts(accounts: MoneyAccount[]) {
  const active = accounts.filter((account) => account.status === 'active');
  const store = active.filter((account) => account.kind !== 'owner');
  const owner = active.find((account) => account.kind === 'owner') ?? null;
  const ownerBalance = owner ? toCents(owner.balance) : 0;
  return {
    store,
    owner,
    storeCents: store.reduce(
      (sum, account) => sum + toCents(account.balance),
      0,
    ),
    /** Quanto a loja deve ao proprietário (saldo negativo da conta dele). */
    owedToOwnerCents: Math.max(0, -ownerBalance),
    missingOpening: store.filter((account) => !account.hasOpeningBalance),
  };
}

/** Diferença que a conferência vai lançar (positivo = entra, negativo = sai). */
export function reconcileDifference(currentCents: number, actualCents: number) {
  return actualCents - currentCents;
}

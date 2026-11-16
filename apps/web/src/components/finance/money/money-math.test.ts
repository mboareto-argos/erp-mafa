import { describe, expect, it } from 'vitest';
import {
  payingAccountLabel,
  receivingAccounts,
} from '@/lib/financial-accounts';
import {
  reconcileDifference,
  summarizeAccounts,
  type MoneyAccount,
} from './money-math';

const account = (
  id: string,
  kind: 'store' | 'owner',
  balance: string,
  extra: Partial<MoneyAccount> = {},
): MoneyAccount => ({
  id,
  name: id,
  kind,
  status: 'active',
  balance,
  hasOpeningBalance: true,
  ...extra,
});

describe('dinheiro da loja (BR §10.13 regras 10–11)', () => {
  it('soma só as contas da loja; o bolso negativo vira "a loja te deve"', () => {
    const summary = summarizeAccounts([
      account('pj', 'store', '1200.64'),
      account('caixa', 'store', '331.4', { hasOpeningBalance: false }),
      account('bolso', 'owner', '-300'),
      account('antiga', 'store', '999', { status: 'inactive' }),
    ]);
    expect(summary.storeCents).toBe(153204);
    expect(summary.owedToOwnerCents).toBe(30000);
    expect(summary.missingOpening.map((item) => item.id)).toEqual(['caixa']);
  });

  it('bolso zerado ou positivo: a loja não deve nada', () => {
    expect(
      summarizeAccounts([account('bolso', 'owner', '0')]).owedToOwnerCents,
    ).toBe(0);
    expect(
      summarizeAccounts([account('bolso', 'owner', '50')]).owedToOwnerCents,
    ).toBe(0);
  });

  it('conferência lança só a diferença (entra ou sai)', () => {
    expect(reconcileDifference(100000, 98735)).toBe(-1265);
    expect(reconcileDifference(100000, 100000)).toBe(0);
  });
});

describe('contas para pagar e receber', () => {
  const contas = [
    { id: 'pj', name: 'Conta PJ', kind: 'store' },
    { id: 'bolso', name: 'Meu bolso', kind: 'owner' },
  ];
  it('para pagar, o bolso aparece como "Do meu bolso"; para receber, some', () => {
    expect(contas.map(payingAccountLabel)).toEqual([
      'Conta PJ',
      'Do meu bolso (Meu bolso)',
    ]);
    expect(receivingAccounts(contas).map((item) => item.id)).toEqual(['pj']);
  });
});

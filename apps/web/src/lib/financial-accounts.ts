// Regras de exibição das contas financeiras (BR §10.13 regras 10–11).
export type AccountLike = {
  id: string;
  name: string;
  kind?: 'store' | 'owner' | string | null;
};

/** Para pagar: a conta do proprietário aparece como "Do meu bolso". */
export function payingAccountLabel(account: AccountLike) {
  return account.kind === 'owner'
    ? `Do meu bolso (${account.name})`
    : account.name;
}

/**
 * Para receber: a conta do proprietário não aparece — ela só registra o
 * dinheiro pessoal usado para pagar coisas da loja; dinheiro de cliente
 * entra numa conta da loja.
 */
export function receivingAccounts<T extends AccountLike>(accounts: T[]) {
  return accounts.filter((account) => account.kind !== 'owner');
}

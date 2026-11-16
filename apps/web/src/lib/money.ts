// Dinheiro na interface é calculado em CENTAVOS inteiros, nunca em float
// (TA-DOMAIN-001). A API devolve decimais como string ("289.9"); estes
// helpers convertem sem perder precisão. O valor oficial é sempre o que a
// API calcula — aqui é só a prévia mostrada antes de confirmar.

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** "289.9" | "289,90" | 289.9 → 28990 */
export function toCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const text = String(value).trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(text)) return 0;
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  // Terceira casa decimal arredonda (meio para cima).
  const rounded = Number(fraction[2] ?? 0) >= 5 ? cents + 1 : cents;
  return negative ? -rounded : rounded;
}

/** 28990 → "289.90" (formato aceito pela API e pelo CurrencyInput) */
export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** 28990 → "R$ 289,90" */
export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

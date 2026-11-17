import { firstName } from '@/lib/campaigns';

// Recibo da venda (BR §10.10, regra 26): link público e a mensagem que vai
// para o cliente.

export const receiptUrl = (origin: string, token: string) =>
  `${origin}/recibo/${token}`;

export function receiptMessage({
  url,
  storeName,
  customerName,
}: {
  url: string;
  storeName: string;
  customerName?: string | null;
}) {
  const greeting = customerName ? `Oi ${firstName(customerName)}! ` : 'Oi! ';
  return `${greeting}Obrigado pela compra na ${storeName}. Seu recibo: ${url}`;
}

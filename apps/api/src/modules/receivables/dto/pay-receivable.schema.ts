import { z } from 'zod';

export const payReceivableSchema = z.object({
  financialAccountId: z.string().uuid('Conta financeira inválida.'),
  // Valor aplicado ao saldo em aberto da conta a receber (nunca pode
  // superar o saldo — RN 10.14.2). Juros/desconto ajustam só o valor em
  // caixa recebido, não o saldo da dívida em si.
  amount: z.number().positive('Valor deve ser maior que zero.'),
  interest: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
});

export type PayReceivableDto = z.infer<typeof payReceivableSchema>;

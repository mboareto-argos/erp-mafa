import { z } from 'zod';

const EXPENSE_CATEGORIES = [
  'mercadorias',
  'frete',
  'embalagem',
  'publicidade',
  'plataforma',
  'telefone',
  'internet',
  'aluguel',
  'energia',
  'transporte',
  'combustivel',
  'taxa',
  'imposto',
  'manutencao',
  'pro_labore',
  'retirada',
  'despesa_administrativa',
  'perda',
  'outra',
] as const;

// RN 10.15.1/10.15.2/10.15.3: registrar uma despesa não significa pagá-la.
// paidNow=true gera uma FinancialTransaction de saída direto; paidNow=false
// exige dueDate e gera automaticamente um Payable vinculado.
export const createExpenseSchema = z
  .object({
    description: z.string().min(1, 'Informe a descrição.').max(500),
    category: z.enum(EXPENSE_CATEGORIES),
    amount: z.number().positive('Valor deve ser maior que zero.'),
    competenceDate: z.coerce.date(),
    paidNow: z.boolean(),
    financialAccountId: z.string().uuid().optional(),
    dueDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => (data.paidNow ? !!data.financialAccountId : !!data.dueDate),
    {
      message:
        'Informe financialAccountId quando paga na hora, ou dueDate quando futura.',
      path: ['financialAccountId'],
    },
  );

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;

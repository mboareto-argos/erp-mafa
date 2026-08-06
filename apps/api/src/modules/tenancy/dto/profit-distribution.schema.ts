import { z } from 'zod';

export const profitDistributionSchema = z.object({
  effectiveFrom: z.coerce.date(),
  reinvestmentRate: z.number().min(0).max(100),
  proLaboreRate: z.number().min(0).max(100),
  reserveRate: z.number().min(0).max(100),
  marketingRate: z.number().min(0).max(100),
}).superRefine((data, ctx) => {
  const total = data.reinvestmentRate + data.proLaboreRate + data.reserveRate + data.marketingRate;
  if (Math.abs(total - 100) > 0.001) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reinvestmentRate'], message: 'A soma da distribuição deve ser exatamente 100%.' });
});

export type ProfitDistributionDto = z.infer<typeof profitDistributionSchema>;

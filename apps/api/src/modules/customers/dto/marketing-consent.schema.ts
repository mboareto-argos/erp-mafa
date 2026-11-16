import { z } from 'zod';

// Origem do aceite (BR §10.9, regra 9).
export const marketingConsentSourceSchema = z.enum([
  'in_person',
  'whatsapp',
  'instagram',
  'other',
]);

// granted=true registra o aceite (data = agora, origem obrigatória);
// granted=false registra que o cliente deixou de querer receber.
export const marketingConsentSchema = z
  .object({
    granted: z.boolean(),
    source: marketingConsentSourceSchema.optional(),
  })
  .strict()
  .refine((dto) => !dto.granted || dto.source !== undefined, {
    message: 'Informe onde o cliente aceitou receber ofertas.',
    path: ['source'],
  });

export type MarketingConsentDto = z.infer<typeof marketingConsentSchema>;

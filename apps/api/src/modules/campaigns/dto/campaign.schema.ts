import { z } from 'zod';
import { productImageUrlSchema } from '../../catalog/products/dto/product-image-url.schema';

// Público (BR §10.9, regra 10). Sempre entre clientes ativos que aceitaram
// receber ofertas (regra 9) — o filtro de consentimento é do servidor.
export const audienceSchema = z.object({
  audience: z.enum(['all', 'birthdays', 'brand', 'inactive']),
  audienceBrandId: z.string().uuid('Marca inválida.').nullable().optional(),
  audienceInactiveDays: z
    .number()
    .int()
    .min(1, 'Informe há quantos dias.')
    .max(3650)
    .nullable()
    .optional(),
});

const fields = {
  title: z.string().trim().min(1, 'Dê um título à campanha.').max(120),
  message: z.string().trim().min(1, 'Escreva a mensagem.').max(2000),
  // Foto enviada pelo próprio sistema (ADR-0003); null remove.
  imageUrl: productImageUrlSchema.nullable().optional(),
};

type AudienceInput = z.infer<typeof audienceSchema>;

export function audienceProblem(dto: Partial<AudienceInput>) {
  if (dto.audience === 'brand' && !dto.audienceBrandId)
    return { path: 'audienceBrandId', message: 'Escolha a marca.' };
  if (dto.audience === 'inactive' && !dto.audienceInactiveDays)
    return {
      path: 'audienceInactiveDays',
      message: 'Informe há quantos dias sem comprar.',
    };
  return null;
}

const refineAudience = (dto: AudienceInput, ctx: z.RefinementCtx) => {
  const problem = audienceProblem(dto);
  if (problem)
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [problem.path],
      message: problem.message,
    });
};

export const createCampaignSchema = audienceSchema
  .extend(fields)
  .strict()
  .superRefine(refineAudience);
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = audienceSchema
  .extend(fields)
  .partial()
  .strict();
export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>;

export const previewAudienceSchema = audienceSchema
  .strict()
  .superRefine(refineAudience);
export type PreviewAudienceDto = z.infer<typeof previewAudienceSchema>;

export const markDeliverySchema = z
  .object({ customerId: z.string().uuid('Cliente inválido.') })
  .strict();
export type MarkDeliveryDto = z.infer<typeof markDeliverySchema>;

import { z } from 'zod';

// BR §10.3, regras 11 e 12: composição (peças e quantidades) e modo do kit.
// mode = null deixa de ser kit (só sem estoque de kit pronto).
export const setKitSchema = z
  .object({
    mode: z.enum(['assembled', 'on_demand']).nullable(),
    components: z
      .array(
        z.object({
          productVariantId: z.string().uuid('Peça inválida.'),
          quantity: z
            .number()
            .positive('A quantidade da peça deve ser maior que zero.'),
        }),
      )
      .max(30, 'Um kit pode ter no máximo 30 peças.')
      .default([]),
  })
  .strict()
  .refine((dto) => dto.mode === null || dto.components.length > 0, {
    message: 'Informe ao menos uma peça do kit.',
    path: ['components'],
  });

export type SetKitDto = z.infer<typeof setKitSchema>;

// BR §10.3, regra 12: "Montar N kits" / "Desmontar".
export const kitAssemblySchema = z
  .object({
    quantity: z
      .number()
      .int('Monte kits inteiros.')
      .positive('A quantidade deve ser maior que zero.')
      .max(1000),
  })
  .strict();

export type KitAssemblyDto = z.infer<typeof kitAssemblySchema>;

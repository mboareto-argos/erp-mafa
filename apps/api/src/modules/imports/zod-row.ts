import { ZodIssue } from 'zod';

// Primeira mensagem por coluna — o suficiente para o relatório de
// importação (BR §10.19: "erros informados por linha e coluna").
export function zodIssuesToRowErrors(
  issues: ZodIssue[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || '_linha';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function emptyToUndefined(
  value: string | undefined,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

import { HttpStatus, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';
import { AppError } from '../errors/app-error';

// Validacao de entrada por schema em todo endpoint (TA-SEC, secao 9.3 de
// docs/architecture/overview.md) — nunca confia so em validacao client-side.
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new AppError(
        'VALIDATION_ERROR',
        issue?.message ?? 'Dados inválidos.',
        HttpStatus.BAD_REQUEST,
        issue ? issue.path.join('.') : undefined,
        { issues: result.error.issues },
      );
    }
    return result.data;
  }
}

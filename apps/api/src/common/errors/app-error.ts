import { HttpException, HttpStatus } from '@nestjs/common';

// Erro de negocio com o formato padrao TA-API-001
// (docs/architecture/overview.md, secao 10.2): code estavel + message em
// portugues, nunca uma mensagem tecnica crua exposta ao usuario final.
export class AppError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly field?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message, status);
  }
}

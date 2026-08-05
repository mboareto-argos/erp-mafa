import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async execute<T>(
    companyId: string,
    operation: string,
    key: string | undefined,
    action: () => Promise<T>,
  ): Promise<T> {
    // Clientes legados seguem compatíveis; web e integrações novas enviam a
    // chave. Quando recebida, ela é obrigatoriamente válida e persistida.
    if (key === undefined) return action();
    if (!key.trim() || key.length > 255)
      throw new AppError(
        'IDEMPOTENCY_KEY_INVALID',
        'Idempotency-Key inválido.',
        HttpStatus.BAD_REQUEST,
        'Idempotency-Key',
      );
    try {
      await this.prisma.idempotencyRecord.create({
        data: { companyId, operation, key },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const previous = await this.prisma.idempotencyRecord.findUniqueOrThrow({
        where: { companyId_operation_key: { companyId, operation, key } },
      });
      if (previous.response !== null) return previous.response as T;
      throw new AppError(
        'IDEMPOTENCY_IN_PROGRESS',
        'Esta operação já está sendo processada. Aguarde antes de tentar novamente.',
        HttpStatus.CONFLICT,
      );
    }
    try {
      const result = await action();
      const response = JSON.parse(
        JSON.stringify(result),
      ) as Prisma.InputJsonValue;
      await this.prisma.idempotencyRecord.update({
        where: { companyId_operation_key: { companyId, operation, key } },
        data: { response, completedAt: new Date() },
      });
      return result;
    } catch (error) {
      await this.prisma.idempotencyRecord.deleteMany({
        where: { companyId, operation, key, completedAt: null },
      });
      throw error;
    }
  }
}

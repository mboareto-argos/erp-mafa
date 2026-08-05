import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static readonly tenantTransaction =
    new AsyncLocalStorage<TransactionClient>();

  constructor() {
    super();
    return new Proxy(this, {
      get: (target, property, receiver): unknown => {
        const transaction = PrismaService.tenantTransaction.getStore();
        if (transaction) {
          if (property === '$transaction') {
            return async <T>(callback: (tx: TransactionClient) => Promise<T>) =>
              callback(transaction);
          }
          const value: unknown = Reflect.get(
            transaction,
            property,
            transaction,
          );
          if (value !== undefined) {
            return typeof value === 'function'
              ? (value as (...args: unknown[]) => unknown).bind(transaction)
              : value;
          }
        }
        return Reflect.get(target, property, receiver);
      },
    });
  }

  async withTenant<T>(
    companyId: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    if (PrismaService.tenantTransaction.getStore()) return callback();

    return super.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT set_config('app.current_company_id', ${companyId}, true)
      `;
      return PrismaService.tenantTransaction.run(tx, callback);
    });
  }
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

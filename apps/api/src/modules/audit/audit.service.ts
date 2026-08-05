import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type AuditEntry = {
  companyId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: Prisma.InputJsonValue;
  afterData?: Prisma.InputJsonValue;
  reason?: string;
  origin?: string;
};

export type AuditListFilter = {
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // Recebe o cliente transacional para que a auditoria acompanhe o rollback
  // da operação de origem.
  record(client: Prisma.TransactionClient, entry: AuditEntry) {
    return client.auditLog.create({
      data: {
        companyId: entry.companyId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeData: entry.beforeData,
        afterData: entry.afterData,
        reason: entry.reason,
        origin: entry.origin ?? 'api',
      },
    });
  }

  // BR §10.23 regra 4: a auditoria deve ser consultável por usuários
  // autorizados (permissão view_audit, restrita ao Owner — §9.1).
  list(companyId: string, filter: AuditListFilter) {
    const limit = Math.min(filter.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.prisma.auditLog.findMany({
      where: {
        companyId,
        entityType: filter.entityType,
        entityId: filter.entityId,
        action: filter.action,
        createdAt:
          filter.from || filter.to
            ? { gte: filter.from, lte: filter.to }
            : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

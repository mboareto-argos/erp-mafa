import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ImportDuplicateAction,
  ImportEntityType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import { ProductsService } from '../catalog/products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { CustomersService } from '../customers/customers.service';
import { SuppliersService } from '../purchasing/suppliers/suppliers.service';
import { ExpensesService } from '../expenses/expenses.service';
import { PayablesService } from '../payables/payables.service';
import { ReceivablesService } from '../receivables/receivables.service';
import { parseCsv, rowsToRecords, stringifyCsv } from './csv';
import { Importer } from './importer.interface';
import { CustomerImporter } from './importers/customer.importer';
import { SupplierImporter } from './importers/supplier.importer';
import { ProductImporter } from './importers/product.importer';
import { InitialStockImporter } from './importers/initial-stock.importer';
import { ExpenseImporter } from './importers/expense.importer';
import { PayableImporter } from './importers/payable.importer';
import { ReceivableImporter } from './importers/receivable.importer';

export type ImportRowPayload = {
  cells: Record<string, string>;
  duplicateAction?: ImportDuplicateAction;
};

export type ConfirmImportPayload = {
  fileName?: string;
  rows: ImportRowPayload[];
  // Total informado a partir da planilha original (RN §34.8) — usado só
  // pelos importers que declaram amountOf() (despesas/contas).
  expectedTotal?: number;
};

@Injectable()
export class ImportsService {
  private readonly importers: Record<ImportEntityType, Importer>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly products: ProductsService,
    private readonly inventory: InventoryService,
    private readonly customers: CustomersService,
    private readonly suppliers: SuppliersService,
    private readonly expenses: ExpensesService,
    private readonly payables: PayablesService,
    private readonly receivables: ReceivablesService,
  ) {
    this.importers = {
      product: new ProductImporter(this.products, this.prisma),
      initial_stock: new InitialStockImporter(
        this.products,
        this.inventory,
        this.prisma,
      ),
      customer: new CustomerImporter(this.customers),
      supplier: new SupplierImporter(this.suppliers),
      expense: new ExpenseImporter(this.expenses),
      payable: new PayableImporter(this.payables),
      receivable: new ReceivableImporter(this.receivables),
    };
  }

  private getImporter(entityType: ImportEntityType): Importer {
    const importer = this.importers[entityType];
    if (!importer) {
      throw new AppError(
        'IMPORT_ENTITY_TYPE_INVALID',
        'Tipo de importação inválido.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return importer;
  }

  template(entityType: ImportEntityType): string {
    return stringifyCsv([[...this.getImporter(entityType).columns]]);
  }

  async preview(
    tenant: CurrentTenantContext,
    entityType: ImportEntityType,
    csv: string,
  ) {
    const importer = this.getImporter(entityType);
    const records = rowsToRecords(parseCsv(csv));
    const seenSkus = new Set<string>();

    const rows = await Promise.all(
      records.map(async ({ rowNumber, cells }) => {
        const validation = await importer.validateRow(tenant, cells);
        if (entityType === 'product' && validation.data) {
          const sku = (validation.data as { sku: string }).sku;
          if (seenSkus.has(sku)) {
            return {
              rowNumber,
              cells,
              errors: { sku: 'SKU duplicado dentro do próprio arquivo.' },
            };
          }
          seenSkus.add(sku);
        }
        return { rowNumber, cells, ...validation };
      }),
    );

    return {
      rows,
      summary: {
        toCreate: rows.filter((r) => r.data && !r.duplicateMatch).length,
        toReview: rows.filter((r) => r.data && r.duplicateMatch).length,
        toReject: rows.filter((r) => r.errors).length,
      },
    };
  }

  async confirm(
    tenant: CurrentTenantContext,
    entityType: ImportEntityType,
    payload: ConfirmImportPayload,
    idempotencyKey?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `imports.confirm:${entityType}`,
      idempotencyKey,
      () => this.doConfirm(tenant, entityType, payload),
    );
  }

  private async doConfirm(
    tenant: CurrentTenantContext,
    entityType: ImportEntityType,
    payload: ConfirmImportPayload,
  ) {
    const importer = this.getImporter(entityType);
    const seenSkus = new Set<string>();
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let rejectedCount = 0;
    let reconciledTotal = new Prisma.Decimal(0);
    let hasAmount = false;

    const rowRecords: Array<{
      rowNumber: number;
      rawData: Record<string, string>;
      status: 'created' | 'updated' | 'skipped' | 'rejected';
      errors?: Record<string, string>;
      resultEntityType?: string;
      resultEntityId?: string;
      duplicateAction?: ImportDuplicateAction;
    }> = [];

    for (const [index, row] of payload.rows.entries()) {
      const rowNumber = index + 2;
      const validation = await importer.validateRow(tenant, row.cells);

      if (entityType === 'product' && validation.data) {
        const sku = (validation.data as { sku: string }).sku;
        if (seenSkus.has(sku)) {
          validation.errors = {
            sku: 'SKU duplicado dentro do próprio arquivo.',
          };
          validation.data = undefined;
        } else {
          seenSkus.add(sku);
        }
      }

      if (!validation.data) {
        rejectedCount += 1;
        rowRecords.push({
          rowNumber,
          rawData: row.cells,
          status: 'rejected',
          errors: validation.errors,
        });
        continue;
      }

      if (validation.duplicateMatch && !row.duplicateAction) {
        rejectedCount += 1;
        rowRecords.push({
          rowNumber,
          rawData: row.cells,
          status: 'rejected',
          errors: {
            _linha:
              'Duplicidade encontrada — escolha uma ação (duplicateAction).',
          },
        });
        continue;
      }

      try {
        const result = await this.persistRowInSavepoint(
          importer,
          tenant,
          { data: validation.data, duplicateMatch: validation.duplicateMatch },
          row.duplicateAction,
          rowNumber,
        );
        if (result.status === 'created') createdCount += 1;
        else if (result.status === 'updated') updatedCount += 1;
        else skippedCount += 1;

        if (importer.amountOf) {
          const amount = importer.amountOf(validation.data);
          if (amount !== undefined) {
            hasAmount = true;
            reconciledTotal = reconciledTotal.add(amount);
          }
        }

        rowRecords.push({
          rowNumber,
          rawData: row.cells,
          status: result.status,
          resultEntityType: result.resultEntityType,
          resultEntityId: result.resultEntityId,
          duplicateAction: row.duplicateAction,
        });
      } catch (error) {
        rejectedCount += 1;
        rowRecords.push({
          rowNumber,
          rawData: row.cells,
          status: 'rejected',
          errors: {
            _linha:
              error instanceof AppError
                ? error.message
                : 'Não foi possível processar esta linha.',
          },
        });
      }
    }

    const job = await this.prisma.importJob.create({
      data: {
        companyId: tenant.companyId,
        entityType,
        status: 'completed',
        fileName: payload.fileName,
        totalRows: payload.rows.length,
        createdCount,
        updatedCount,
        skippedCount,
        rejectedCount,
        expectedTotal: payload.expectedTotal,
        reconciledTotal: hasAmount ? reconciledTotal : undefined,
        createdBy: tenant.userId,
      },
    });

    if (rowRecords.length > 0) {
      await this.prisma.importRow.createMany({
        data: rowRecords.map((row) => ({
          importJobId: job.id,
          companyId: tenant.companyId,
          rowNumber: row.rowNumber,
          rawData: row.rawData,
          status: row.status,
          errors: row.errors,
          resultEntityType: row.resultEntityType,
          resultEntityId: row.resultEntityId,
          duplicateAction: row.duplicateAction,
        })),
      });
    }

    await this.audit.record(this.prisma, {
      companyId: tenant.companyId,
      userId: tenant.userId,
      action: 'import.confirmed',
      entityType: 'import_job',
      entityId: job.id,
      afterData: {
        entityType,
        createdCount,
        updatedCount,
        skippedCount,
        rejectedCount,
      },
    });

    return this.getJob(tenant.companyId, job.id);
  }

  // Isola o efeito de cada linha com um SAVEPOINT: a requisição inteira já
  // roda dentro de uma única transação por tenant (RLS/TenantTransactionInterceptor).
  // Sem isolamento por linha, um erro de banco em uma linha (ex.: corrida de
  // unicidade) deixaria a transação inteira "abortada" no Postgres e
  // reprovaria silenciosamente todas as linhas seguintes — RN 10.19.3 exige
  // erro isolado por linha.
  private async persistRowInSavepoint(
    importer: Importer,
    tenant: CurrentTenantContext,
    validRow: Parameters<Importer['persistRow']>[1],
    duplicateAction: ImportDuplicateAction | undefined,
    rowNumber: number,
  ) {
    const savepoint = `import_row_${rowNumber}`;
    await this.prisma.$executeRawUnsafe(`SAVEPOINT "${savepoint}"`);
    try {
      const result = await importer.persistRow(
        tenant,
        validRow,
        duplicateAction,
      );
      await this.prisma.$executeRawUnsafe(`RELEASE SAVEPOINT "${savepoint}"`);
      return result;
    } catch (error) {
      await this.prisma.$executeRawUnsafe(
        `ROLLBACK TO SAVEPOINT "${savepoint}"`,
      );
      throw error;
    }
  }

  list(companyId: string) {
    return this.prisma.importJob.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getJob(companyId: string, id: string) {
    const job = await this.prisma.importJob.findFirst({
      where: { id, companyId },
      include: { rows: { orderBy: { rowNumber: 'asc' } } },
    });
    if (!job) {
      throw new AppError(
        'IMPORT_JOB_NOT_FOUND',
        'Importação não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    const divergence =
      job.expectedTotal !== null && job.reconciledTotal !== null
        ? new Prisma.Decimal(job.reconciledTotal).sub(job.expectedTotal)
        : null;
    return { ...job, divergence };
  }

  async revert(
    tenant: CurrentTenantContext,
    id: string,
    idempotencyKey?: string,
  ) {
    return this.idempotency.execute(
      tenant.companyId,
      `imports.revert:${id}`,
      idempotencyKey,
      () => this.doRevert(tenant, id),
    );
  }

  // Reversão soft (BR §34.8: "reversível antes do aceite final") — nunca
  // apaga linha (TA-DATA-001). Só desfaz linhas com status "created": uma
  // linha "updated" (alias registrado num produto pré-existente) não é
  // desfeita automaticamente, porque o produto já existia antes deste job.
  private async doRevert(tenant: CurrentTenantContext, id: string) {
    const job = await this.prisma.importJob.findFirst({
      where: { id, companyId: tenant.companyId },
      include: { rows: true },
    });
    if (!job) {
      throw new AppError(
        'IMPORT_JOB_NOT_FOUND',
        'Importação não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (job.status === 'reverted') {
      throw new AppError(
        'IMPORT_ALREADY_REVERTED',
        'Esta importação já foi revertida.',
        HttpStatus.CONFLICT,
      );
    }

    for (const row of job.rows) {
      if (row.status !== 'created' || !row.resultEntityId) continue;
      await this.revertRow(
        tenant,
        row.resultEntityType,
        row.resultEntityId,
        row.rawData,
      );
    }

    const reverted = await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: 'reverted',
        revertedAt: new Date(),
        revertedBy: tenant.userId,
      },
    });

    await this.audit.record(this.prisma, {
      companyId: tenant.companyId,
      userId: tenant.userId,
      action: 'import.reverted',
      entityType: 'import_job',
      entityId: job.id,
    });

    return reverted;
  }

  private async revertRow(
    tenant: CurrentTenantContext,
    resultEntityType: string | null,
    resultEntityId: string,
    rawData: Prisma.JsonValue,
  ) {
    switch (resultEntityType) {
      case 'product':
        await this.products.deactivate(tenant.companyId, resultEntityId);
        return;
      case 'customer':
        await this.customers.deactivate(tenant.companyId, resultEntityId);
        return;
      case 'supplier':
        await this.suppliers.deactivate(tenant.companyId, resultEntityId);
        return;
      case 'payable':
        await this.payables.cancel(tenant, resultEntityId, {
          reason: 'Importação revertida antes do aceite final.',
        });
        return;
      case 'receivable':
        await this.receivables.cancel(tenant, resultEntityId, {
          reason: 'Importação revertida antes do aceite final.',
        });
        return;
      case 'expense':
        await this.expenses.cancel(tenant, resultEntityId);
        return;
      case 'stock_movement': {
        const cells = rawData as Record<string, string>;
        const quantity = Number(String(cells.quantity).replace(',', '.'));
        await this.inventory.adjustStock(tenant, {
          productVariantId: resultEntityId,
          quantity: -quantity,
          reason: 'Reversão de importação de estoque inicial.',
        });
        return;
      }
      default:
        return;
    }
  }
}

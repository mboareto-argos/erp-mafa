import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { ReceivablesService } from '../../receivables/receivables.service';
import {
  createReceivableSchema,
  type CreateReceivableDto,
} from '../../receivables/dto/create-receivable.schema';
import {
  Importer,
  ImportPersistResult,
  ImportRowValidation,
  ValidRow,
} from '../importer.interface';
import { emptyToUndefined, zodIssuesToRowErrors } from '../zod-row';

export const RECEIVABLE_IMPORT_COLUMNS = [
  'description',
  'amountOriginal',
  'dueDate',
] as const;

// Sem vínculo de cliente/venda via CSV nesta rodada (exigiria uuid) — mesma
// simplificação de payable.importer.ts.
export class ReceivableImporter implements Importer<CreateReceivableDto> {
  entityType = 'receivable' as const;
  columns = RECEIVABLE_IMPORT_COLUMNS;

  constructor(private readonly receivables: ReceivablesService) {}

  validateRow(
    _tenant: CurrentTenantContext,
    cells: Record<string, string>,
  ): Promise<ImportRowValidation<CreateReceivableDto>> {
    const amountValue = emptyToUndefined(cells.amountOriginal);
    const result = createReceivableSchema.safeParse({
      description: emptyToUndefined(cells.description),
      amountOriginal: amountValue
        ? Number(amountValue.replace(',', '.'))
        : undefined,
      dueDate: emptyToUndefined(cells.dueDate),
    });
    if (!result.success) {
      return Promise.resolve({
        errors: zodIssuesToRowErrors(result.error.issues),
      });
    }
    return Promise.resolve({ data: result.data });
  }

  async persistRow(
    tenant: CurrentTenantContext,
    validRow: ValidRow<CreateReceivableDto>,
  ): Promise<ImportPersistResult> {
    const receivable = await this.receivables.create(tenant, validRow.data);
    return {
      status: 'created',
      resultEntityType: 'receivable',
      resultEntityId: receivable.id,
    };
  }

  amountOf(data: CreateReceivableDto): number {
    return data.amountOriginal;
  }
}

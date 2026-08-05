import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { PayablesService } from '../../payables/payables.service';
import {
  createPayableSchema,
  type CreatePayableDto,
} from '../../payables/dto/create-payable.schema';
import {
  Importer,
  ImportPersistResult,
  ImportRowValidation,
  ValidRow,
} from '../importer.interface';
import { emptyToUndefined, zodIssuesToRowErrors } from '../zod-row';

export const PAYABLE_IMPORT_COLUMNS = [
  'description',
  'amountOriginal',
  'dueDate',
] as const;

// Sem vínculo de fornecedor via CSV nesta rodada (exigiria uuid) — mesma
// simplificação aplicada a categoria/marca em produtos. Pode ser ajustado
// depois manualmente.
export class PayableImporter implements Importer<CreatePayableDto> {
  entityType = 'payable' as const;
  columns = PAYABLE_IMPORT_COLUMNS;

  constructor(private readonly payables: PayablesService) {}

  validateRow(
    _tenant: CurrentTenantContext,
    cells: Record<string, string>,
  ): Promise<ImportRowValidation<CreatePayableDto>> {
    const amountValue = emptyToUndefined(cells.amountOriginal);
    const result = createPayableSchema.safeParse({
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
    validRow: ValidRow<CreatePayableDto>,
  ): Promise<ImportPersistResult> {
    const payable = await this.payables.create(tenant, validRow.data);
    return {
      status: 'created',
      resultEntityType: 'payable',
      resultEntityId: payable.id,
    };
  }

  amountOf(data: CreatePayableDto): number {
    return data.amountOriginal;
  }
}

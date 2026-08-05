import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { SuppliersService } from '../../purchasing/suppliers/suppliers.service';
import {
  createSupplierSchema,
  type CreateSupplierDto,
} from '../../purchasing/suppliers/dto/create-supplier.schema';
import {
  Importer,
  ImportPersistResult,
  ImportRowValidation,
  ValidRow,
} from '../importer.interface';
import { emptyToUndefined, zodIssuesToRowErrors } from '../zod-row';

export const SUPPLIER_IMPORT_COLUMNS = [
  'name',
  'document',
  'contactName',
  'phone',
  'whatsapp',
  'email',
] as const;

export class SupplierImporter implements Importer<CreateSupplierDto> {
  entityType = 'supplier' as const;
  columns = SUPPLIER_IMPORT_COLUMNS;

  constructor(private readonly suppliers: SuppliersService) {}

  validateRow(
    _tenant: CurrentTenantContext,
    cells: Record<string, string>,
  ): Promise<ImportRowValidation<CreateSupplierDto>> {
    const result = createSupplierSchema.safeParse({
      name: emptyToUndefined(cells.name),
      document: emptyToUndefined(cells.document),
      contactName: emptyToUndefined(cells.contactName),
      phone: emptyToUndefined(cells.phone),
      whatsapp: emptyToUndefined(cells.whatsapp),
      email: emptyToUndefined(cells.email),
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
    validRow: ValidRow<CreateSupplierDto>,
  ): Promise<ImportPersistResult> {
    const supplier = await this.suppliers.create(tenant, validRow.data);
    return {
      status: 'created',
      resultEntityType: 'supplier',
      resultEntityId: supplier.id,
    };
  }
}

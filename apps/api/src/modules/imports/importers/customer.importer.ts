import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { CustomersService } from '../../customers/customers.service';
import {
  createCustomerSchema,
  type CreateCustomerDto,
} from '../../customers/dto/create-customer.schema';
import {
  Importer,
  ImportPersistResult,
  ImportRowValidation,
  ValidRow,
} from '../importer.interface';
import { emptyToUndefined, zodIssuesToRowErrors } from '../zod-row';

export const CUSTOMER_IMPORT_COLUMNS = [
  'name',
  'whatsapp',
  'phone',
  'email',
  'instagram',
  'birthDate',
] as const;

export class CustomerImporter implements Importer<CreateCustomerDto> {
  entityType = 'customer' as const;
  columns = CUSTOMER_IMPORT_COLUMNS;

  constructor(private readonly customers: CustomersService) {}

  validateRow(
    _tenant: CurrentTenantContext,
    cells: Record<string, string>,
  ): Promise<ImportRowValidation<CreateCustomerDto>> {
    const result = createCustomerSchema.safeParse({
      name: emptyToUndefined(cells.name),
      whatsapp: emptyToUndefined(cells.whatsapp),
      phone: emptyToUndefined(cells.phone),
      email: emptyToUndefined(cells.email),
      instagram: emptyToUndefined(cells.instagram),
      birthDate: emptyToUndefined(cells.birthDate),
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
    validRow: ValidRow<CreateCustomerDto>,
  ): Promise<ImportPersistResult> {
    const customer = await this.customers.create(tenant, validRow.data);
    return {
      status: 'created',
      resultEntityType: 'customer',
      resultEntityId: customer.id,
    };
  }
}

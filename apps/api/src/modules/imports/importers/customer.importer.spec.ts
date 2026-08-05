import { CustomerImporter } from './customer.importer';
import { CustomersService } from '../../customers/customers.service';

describe('CustomerImporter — validação de linha', () => {
  // validateRow não toca o banco — CustomersService pode ser um stub aqui.
  const importer = new CustomerImporter({} as CustomersService);
  const tenant = { companyId: 'company-1', userId: 'user-1' } as never;

  it('aceita uma linha válida com campos opcionais vazios', async () => {
    const result = await importer.validateRow(tenant, {
      name: 'Ana Souza',
      whatsapp: '',
      phone: '',
      email: '',
      instagram: '',
      birthDate: '',
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ name: 'Ana Souza' });
  });

  it('rejeita linha sem nome com erro na coluna certa', async () => {
    const result = await importer.validateRow(tenant, { name: '' });
    expect(result.data).toBeUndefined();
    expect(result.errors).toHaveProperty('name');
  });

  it('rejeita e-mail em formato inválido', async () => {
    const result = await importer.validateRow(tenant, {
      name: 'Ana',
      email: 'não-é-email',
    });
    expect(result.errors).toHaveProperty('email');
  });
});

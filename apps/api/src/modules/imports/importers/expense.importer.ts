import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import { ExpensesService } from '../../expenses/expenses.service';
import {
  createExpenseSchema,
  type CreateExpenseDto,
} from '../../expenses/dto/create-expense.schema';
import {
  Importer,
  ImportPersistResult,
  ImportRowValidation,
  ValidRow,
} from '../importer.interface';
import { emptyToUndefined, zodIssuesToRowErrors } from '../zod-row';

export const EXPENSE_IMPORT_COLUMNS = [
  'description',
  'category',
  'amount',
  'competenceDate',
  'dueDate',
] as const;

// Sempre importa como despesa futura (paidNow=false), que já gera um Payable
// vinculado (regra existente de ExpensesService.create) — pagar direto na
// hora exigiria financialAccountId, que exigiria o usuário conhecer um uuid
// via CSV; fora de escopo nesta rodada (mesma simplificação de payable/
// receivable).
export class ExpenseImporter implements Importer<CreateExpenseDto> {
  entityType = 'expense' as const;
  columns = EXPENSE_IMPORT_COLUMNS;

  constructor(private readonly expenses: ExpensesService) {}

  validateRow(
    _tenant: CurrentTenantContext,
    cells: Record<string, string>,
  ): Promise<ImportRowValidation<CreateExpenseDto>> {
    const amountValue = emptyToUndefined(cells.amount);
    const result = createExpenseSchema.safeParse({
      description: emptyToUndefined(cells.description),
      category: emptyToUndefined(cells.category),
      amount: amountValue ? Number(amountValue.replace(',', '.')) : undefined,
      competenceDate: emptyToUndefined(cells.competenceDate),
      paidNow: false,
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
    validRow: ValidRow<CreateExpenseDto>,
  ): Promise<ImportPersistResult> {
    const expense = await this.expenses.create(tenant, validRow.data);
    return {
      status: 'created',
      resultEntityType: 'expense',
      resultEntityId: expense.id,
    };
  }

  amountOf(data: CreateExpenseDto): number {
    return data.amount;
  }
}

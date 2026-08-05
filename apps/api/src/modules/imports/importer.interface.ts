import { ImportDuplicateAction, ImportEntityType } from '@prisma/client';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';

export type ImportRowErrors = Record<string, string>;

export interface ImportRowValidation<T> {
  data?: T;
  errors?: ImportRowErrors;
  // Só relevante para o importer de produto (RN-IMP-001/002): aponta um
  // produto já cadastrado encontrado por SKU/nome/alias, exigindo que o
  // cliente informe duplicateAction na confirmação.
  duplicateMatch?: { entityId: string; entityLabel: string; matchedBy: string };
}

export interface ImportPersistResult {
  status: 'created' | 'updated' | 'skipped';
  resultEntityType: string;
  resultEntityId?: string;
}

export interface ValidRow<T> {
  data: T;
  duplicateMatch?: ImportRowValidation<T>['duplicateMatch'];
}

// Cada tipo de entidade importável implementa esta interface reaproveitando
// o service e o schema Zod de criação já existentes do módulo de negócio
// correspondente — o importer nunca duplica regra de validação/persistência,
// só adapta uma linha de planilha para o formato que o service já aceita.
export interface Importer<T = Record<string, unknown>> {
  entityType: ImportEntityType;
  // Cabeçalho do modelo baixável (GET /imports/:entityType/template).
  columns: readonly string[];
  validateRow(
    tenant: CurrentTenantContext,
    cells: Record<string, string>,
  ): Promise<ImportRowValidation<T>>;
  // `duplicateAction` só é relevante (e obrigatório) quando `validRow.duplicateMatch`
  // veio preenchido do preview — RN-IMP-002.
  persistRow(
    tenant: CurrentTenantContext,
    validRow: ValidRow<T>,
    duplicateAction?: ImportDuplicateAction,
  ): Promise<ImportPersistResult>;
  // Usado na reconciliação (RN §34.8) só pelos importers cujo valor por
  // linha faz sentido somar (despesas, contas a pagar/receber).
  amountOf?(data: T): number | undefined;
}

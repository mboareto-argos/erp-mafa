import { HttpStatus } from '@nestjs/common';
import { ImportEntityType } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';

const VALID_TYPES: readonly string[] = [
  'product',
  'initial_stock',
  'customer',
  'supplier',
  'expense',
  'payable',
  'receivable',
];

export function parseImportEntityType(value: string): ImportEntityType {
  if (!VALID_TYPES.includes(value)) {
    throw new AppError(
      'IMPORT_ENTITY_TYPE_INVALID',
      'Tipo de importação inválido.',
      HttpStatus.BAD_REQUEST,
      'entityType',
    );
  }
  return value as ImportEntityType;
}

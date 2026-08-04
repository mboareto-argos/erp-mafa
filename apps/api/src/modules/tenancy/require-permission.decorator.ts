import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

// TA-SEC-001: checagem de permissao sempre no backend, via guard/decorator
// por endpoint — nunca so no frontend.
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

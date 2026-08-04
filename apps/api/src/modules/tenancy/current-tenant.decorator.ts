import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  CurrentTenantContext,
  RequestWithTenant,
} from './jwt-payload.interface';

// Extrai o tenant ja resolvido pelo JwtAuthGuard (request.user) — nunca lê
// company_id de param/header/body da requisicao (TA-TENANT-002).
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentTenantContext => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    return request.user;
  },
);

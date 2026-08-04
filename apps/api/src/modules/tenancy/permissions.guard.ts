import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../../common/errors/app-error';
import { PERMISSION_KEY } from './require-permission.decorator';
import { RequestWithTenant } from './jwt-payload.interface';

// Roda depois do JwtAuthGuard — nunca substitui a resolucao de tenant, so
// checa se a permissao exigida pelo endpoint esta na lista do usuario
// (TA-SEC-001). Sem @RequirePermission() no handler, deixa passar.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string | undefined>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    if (!required) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Partial<RequestWithTenant>>();

    if (!request.user?.permissions.includes(required)) {
      throw new AppError(
        'FORBIDDEN',
        'Você não tem permissão para realizar esta ação.',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}

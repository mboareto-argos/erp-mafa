import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import type { RequestWithTenant } from '../modules/tenancy/jwt-payload.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class TenantTransactionInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const companyId = request.user?.companyId;

    if (!companyId) return next.handle();

    return from(
      this.prisma.withTenant(companyId, () => lastValueFrom(next.handle())),
    );
  }
}

import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AccessTokenPayload,
  CurrentTenantContext,
} from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // So aceita tokens de acesso completos (com company_id ja validado contra
  // Membership em /auth/select-company) — nunca o token de pre-auth.
  //
  // O vinculo e' conferido no banco a CADA requisicao (TA-TENANT-002): membro
  // removido ou usuario bloqueado perde o acesso na hora, e papel/permissoes
  // vem do vinculo atual, nao do token emitido antes. Sem cache de proposito:
  // a API roda em varias instancias e um cache local atrasaria a revogacao.
  async validate(payload: AccessTokenPayload): Promise<CurrentTenantContext> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException();
    }
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: payload.sub,
        companyId: payload.companyId,
        status: 'active',
        deletedAt: null,
        user: { status: { not: 'blocked' } },
      },
      select: { role: { select: { name: true, permissions: true } } },
    });
    if (!membership) {
      throw new AppError(
        'SESSION_EXPIRED',
        'Sessão expirada. Faça login novamente.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return {
      userId: payload.sub,
      companyId: payload.companyId,
      roleName: membership.role.name,
      permissions: membership.role.permissions,
    };
  }
}

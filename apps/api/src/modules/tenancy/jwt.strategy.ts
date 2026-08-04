import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AccessTokenPayload,
  CurrentTenantContext,
} from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // So aceita tokens de acesso completos (com company_id ja validado contra
  // Membership em /auth/select-company) — nunca o token de pre-auth.
  validate(payload: AccessTokenPayload): CurrentTenantContext {
    if (payload.type !== 'access') {
      throw new UnauthorizedException();
    }
    return {
      userId: payload.sub,
      companyId: payload.companyId,
      roleName: payload.roleName,
      permissions: payload.permissions,
    };
  }
}

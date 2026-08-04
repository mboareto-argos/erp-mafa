import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AccessTokenPayload } from './jwt-payload.interface';

describe('JwtStrategy', () => {
  const config = {
    getOrThrow: () => 'test-secret',
  } as unknown as ConfigService;
  const strategy = new JwtStrategy(config);

  it('resolve o tenant a partir de um token de acesso válido', () => {
    const payload: AccessTokenPayload = {
      type: 'access',
      sub: 'user-1',
      companyId: 'company-1',
      roleName: 'owner',
      permissions: ['manage_catalog'],
    };

    expect(strategy.validate(payload)).toEqual({
      userId: 'user-1',
      companyId: 'company-1',
      roleName: 'owner',
      permissions: ['manage_catalog'],
    });
  });

  it('rejeita qualquer payload que não seja do tipo "access" (ex.: token de pré-auth)', () => {
    const preauthLikePayload = {
      type: 'preauth',
      sub: 'user-1',
    } as unknown as AccessTokenPayload;
    expect(() => strategy.validate(preauthLikePayload)).toThrow(
      UnauthorizedException,
    );
  });
});

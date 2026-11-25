import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { AccessTokenPayload } from './jwt-payload.interface';

describe('JwtStrategy', () => {
  const config = {
    getOrThrow: () => 'test-secret',
  } as unknown as ConfigService;
  const findFirst = jest.fn();
  const prisma = { membership: { findFirst } } as unknown as PrismaService;
  const strategy = new JwtStrategy(config, prisma);
  const payload: AccessTokenPayload = {
    type: 'access',
    sub: 'user-1',
    companyId: 'company-1',
    roleName: 'owner',
    permissions: ['manage_catalog'],
  };

  beforeEach(() => findFirst.mockReset());

  it('resolve o tenant com o papel e as permissões do vínculo atual, não os do token', async () => {
    findFirst.mockResolvedValue({
      role: { name: 'sales', permissions: ['view_sales'] },
    });

    await expect(strategy.validate(payload)).resolves.toEqual({
      userId: 'user-1',
      companyId: 'company-1',
      roleName: 'sales',
      permissions: ['view_sales'],
    });
  });

  it('rejeita o token quando não há vínculo ativo com a empresa', async () => {
    findFirst.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
  });

  it('rejeita qualquer payload que não seja do tipo "access" (ex.: token de pré-auth)', async () => {
    const preauthLikePayload = {
      type: 'preauth',
      sub: 'user-1',
    } as unknown as AccessTokenPayload;

    await expect(strategy.validate(preauthLikePayload)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(findFirst).not.toHaveBeenCalled();
  });
});

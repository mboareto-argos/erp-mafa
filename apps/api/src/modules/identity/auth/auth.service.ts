import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AppError } from '../../../common/errors/app-error';
import { parseDurationToMs, JwtDuration } from '../../../common/utils/duration';
import { RegisterDto } from './dto/register.schema';
import { LoginDto } from './dto/login.schema';
import { SelectCompanyDto } from './dto/select-company.schema';
import {
  AccessTokenPayload,
  CurrentTenantContext,
} from '../../tenancy/jwt-payload.interface';

interface PreauthTokenPayload {
  type: 'preauth';
  sub: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Cria User + Company + Membership(owner) numa unica transacao — RN 10.1.6
  // (primeiro usuario da empresa e' proprietario) / RN 10.2.2 (proprietario
  // vinculado automaticamente). Sem ambiguidade de empresa (acabou de ser
  // criada), entao aqui — so aqui — pulamos o passo de select-company e ja
  // devolvemos tokens de acesso escopados a ela.
  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new AppError(
        'EMAIL_IN_USE',
        'Este e-mail já está em uso.',
        HttpStatus.CONFLICT,
        'email',
      );
    }

    const passwordHash = await this.users.hashPassword(dto.password);
    const ownerRole = await this.prisma.role.findUniqueOrThrow({
      where: { name: 'owner' },
    });

    const { user, company } = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: dto.companyName },
      });
      const user = await tx.user.create({
        data: { name: dto.name, email: dto.email, passwordHash },
      });
      await tx.membership.create({
        data: {
          companyId: company.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: 'active',
          createdBy: user.id,
        },
      });
      return { user, company };
    });

    return this.issueSession({
      userId: user.id,
      companyId: company.id,
      roleName: ownerRole.name,
      permissions: ownerRole.permissions,
      userName: user.name,
      userEmail: user.email,
      companyName: company.name,
    });
  }

  // Nunca revela qual campo esta incorreto (RN 10.1, criterio de aceite) —
  // uma unica mensagem generica para e-mail inexistente ou senha errada.
  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    const invalidCredentials = () =>
      new AppError(
        'INVALID_CREDENTIALS',
        'E-mail ou senha inválidos.',
        HttpStatus.UNAUTHORIZED,
      );

    if (!user) {
      throw invalidCredentials();
    }
    const passwordMatches = await this.users.verifyPassword(
      user.passwordHash,
      dto.password,
    );
    if (!passwordMatches) {
      throw invalidCredentials();
    }
    if (user.status === 'blocked') {
      throw new AppError(
        'USER_BLOCKED',
        'Este usuário está bloqueado. Fale com o administrador da sua empresa.',
        HttpStatus.FORBIDDEN,
      );
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id, status: 'active', deletedAt: null },
      include: { company: true, role: true },
    });

    if (memberships.length === 0) {
      throw new AppError(
        'NO_COMPANY_MEMBERSHIP',
        'Este usuário não está vinculado a nenhuma empresa.',
        HttpStatus.FORBIDDEN,
      );
    }

    const preauthToken = await this.jwt.signAsync(
      { type: 'preauth', sub: user.id } satisfies PreauthTokenPayload,
      {
        expiresIn: this.config.getOrThrow<JwtDuration>(
          'JWT_PREAUTH_EXPIRES_IN',
        ),
      },
    );

    return {
      preauthToken,
      companies: memberships.map((m) => ({
        companyId: m.company.id,
        companyName: m.company.name,
        roleName: m.role.name,
      })),
    };
  }

  // Troca o token de pre-auth + uma empresa escolhida por um par de tokens
  // escopados — so emite depois de cruzar contra o Membership real
  // (TA-TENANT-002: nunca confia no companyId cru do cliente).
  async selectCompany(dto: SelectCompanyDto) {
    const userId = await this.verifyPreauthToken(dto.preauthToken);

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        companyId: dto.companyId,
        status: 'active',
        deletedAt: null,
      },
      include: { company: true, role: true, user: true },
    });

    if (!membership) {
      throw new AppError(
        'INVALID_COMPANY',
        'Você não tem acesso a esta empresa.',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.issueSession({
      userId,
      companyId: membership.companyId,
      roleName: membership.role.name,
      permissions: membership.role.permissions,
      userName: membership.user.name,
      userEmail: membership.user.email,
      companyName: membership.company.name,
    });
  }

  async refresh(refreshTokenRaw: string) {
    const tokenHash = this.hashRefreshToken(refreshTokenRaw);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError(
        'INVALID_REFRESH_TOKEN',
        'Sessão expirada. Faça login novamente.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Revalida o Membership no momento do refresh — nunca confia so no
    // claim antigo, caso o vinculo tenha mudado desde o login.
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: stored.userId,
        companyId: stored.companyId,
        status: 'active',
        deletedAt: null,
      },
      include: { company: true, role: true, user: true },
    });

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    if (!membership || membership.user.status === 'blocked') {
      throw new AppError(
        'INVALID_REFRESH_TOKEN',
        'Sessão expirada. Faça login novamente.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.issueSession({
      userId: membership.userId,
      companyId: membership.companyId,
      roleName: membership.role.name,
      permissions: membership.role.permissions,
      userName: membership.user.name,
      userEmail: membership.user.email,
      companyName: membership.company.name,
    });
  }

  async logout(refreshTokenRaw: string) {
    const tokenHash = this.hashRefreshToken(refreshTokenRaw);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(tenant: CurrentTenantContext) {
    const [user, company] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: tenant.userId } }),
      this.prisma.company.findUniqueOrThrow({
        where: { id: tenant.companyId },
      }),
    ]);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      company: {
        id: company.id,
        name: company.name,
        brandAccentColor: company.brandAccentColor,
      },
      roleName: tenant.roleName,
      permissions: tenant.permissions,
    };
  }

  private async verifyPreauthToken(token: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<PreauthTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      if (payload.type !== 'preauth') {
        throw new Error('unexpected token type');
      }
      return payload.sub;
    } catch {
      throw new AppError(
        'INVALID_PREAUTH_TOKEN',
        'Sessão de login expirada. Faça login novamente.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private async issueSession(params: {
    userId: string;
    companyId: string;
    roleName: string;
    permissions: string[];
    userName: string;
    userEmail: string;
    companyName: string;
  }) {
    const accessToken = await this.jwt.signAsync(
      {
        type: 'access',
        sub: params.userId,
        companyId: params.companyId,
        roleName: params.roleName,
        permissions: params.permissions,
      } satisfies AccessTokenPayload,
      {
        expiresIn: this.config.getOrThrow<JwtDuration>('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    const refreshTokenRaw = randomBytes(48).toString('hex');
    const refreshExpiresIn = this.config.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: params.userId,
        companyId: params.companyId,
        tokenHash: this.hashRefreshToken(refreshTokenRaw),
        expiresAt: new Date(Date.now() + parseDurationToMs(refreshExpiresIn)),
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      user: {
        id: params.userId,
        name: params.userName,
        email: params.userEmail,
      },
      company: { id: params.companyId, name: params.companyName },
      roleName: params.roleName,
      permissions: params.permissions,
    };
  }

  private hashRefreshToken(raw: string) {
    // Refresh token ja e' um segredo de alta entropia (48 bytes aleatorios) —
    // hash rapido (SHA-256) e' suficiente para o lookup, ao contrario da
    // senha (Argon2id, deliberadamente lento contra brute-force).
    return createHash('sha256').update(raw).digest('hex');
  }
}

import { HttpStatus, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { AuditService } from '../../audit/audit.service';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import type { InviteUserDto } from './dto/invite-user.schema';
import type { UpdateMembershipDto } from './dto/update-membership.schema';
import type { AcceptInvitationDto } from './dto/accept-invitation.schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Senha nunca armazenada em formato reversível (RN 10.1.7) — Argon2id
  // conforme docs/architecture/overview.md, secao 9.1.
  hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  verifyPassword(passwordHash: string, password: string) {
    return argon2.verify(passwordHash, password);
  }

  async listCompanyUsers(companyId: string) {
    const [memberships, invitations, roles] = await Promise.all([
      this.prisma.membership.findMany({
        where: { companyId, deletedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true, status: true } },
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.invitation.findMany({
        where: { companyId, deletedAt: null, expiresAt: { gt: new Date() } },
        include: { role: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    ]);
    return { memberships, invitations, roles };
  }

  async invite(tenant: CurrentTenantContext, dto: InviteUserDto) {
    this.assertRoleAuthority(tenant, dto.roleName);
    const role = await this.role(dto.roleName);
    const existingUser = await this.findByEmail(dto.email);
    if (existingUser) {
      const current = await this.prisma.membership.findUnique({
        where: {
          companyId_userId: {
            companyId: tenant.companyId,
            userId: existingUser.id,
          },
        },
      });
      if (current?.status === 'active')
        throw new AppError(
          'USER_ALREADY_MEMBER',
          'Este usuário já faz parte da empresa.',
          HttpStatus.CONFLICT,
          'email',
        );
      return this.prisma.$transaction(async (tx) => {
        const membership = await tx.membership.upsert({
          where: {
            companyId_userId: {
              companyId: tenant.companyId,
              userId: existingUser.id,
            },
          },
          update: { roleId: role.id, status: 'active', deletedAt: null },
          create: {
            companyId: tenant.companyId,
            userId: existingUser.id,
            roleId: role.id,
            status: 'active',
            createdBy: tenant.userId,
          },
        });
        await this.audit.record(tx, {
          companyId: tenant.companyId,
          userId: tenant.userId,
          action: 'user.added',
          entityType: 'membership',
          entityId: membership.id,
          afterData: {
            invitedUserId: existingUser.id,
            email: existingUser.email,
            roleName: role.name,
          },
        });
        return { type: 'member', membership };
      });
    }

    const token = randomBytes(32).toString('hex');
    return this.prisma.$transaction(async (tx) => {
      await tx.invitation.updateMany({
        where: {
          companyId: tenant.companyId,
          email: dto.email,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      const invitation = await tx.invitation.create({
        data: {
          companyId: tenant.companyId,
          email: dto.email,
          roleId: role.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdBy: tenant.userId,
        },
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action: 'user.invited',
        entityType: 'invitation',
        entityId: invitation.id,
        afterData: {
          email: dto.email,
          roleName: role.name,
          expiresAt: invitation.expiresAt.toISOString(),
        },
      });
      return {
        type: 'invitation',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          token: invitation.token,
          expiresAt: invitation.expiresAt,
          roleName: role.name,
        },
      };
    });
  }

  async updateMembership(
    tenant: CurrentTenantContext,
    membershipId: string,
    dto: UpdateMembershipDto,
  ) {
    this.assertRoleAuthority(tenant, dto.roleName);
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, companyId: tenant.companyId, deletedAt: null },
      include: { role: true, user: true },
    });
    if (!membership)
      throw new AppError(
        'MEMBERSHIP_NOT_FOUND',
        'Usuário da empresa não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    if (membership.role.name === 'owner' && tenant.roleName !== 'owner')
      throw new AppError(
        'OWNER_MEMBERSHIP_RESTRICTED',
        'Somente o proprietário pode alterar outro proprietário.',
        HttpStatus.FORBIDDEN,
      );
    if (membership.userId === tenant.userId && dto.status === 'removed')
      throw new AppError(
        'CANNOT_REMOVE_SELF',
        'Você não pode remover o próprio acesso.',
        HttpStatus.CONFLICT,
      );
    if (
      membership.role.name === 'owner' &&
      (dto.roleName !== 'owner' || dto.status === 'removed')
    ) {
      const owners = await this.prisma.membership.count({
        where: {
          companyId: tenant.companyId,
          status: 'active',
          deletedAt: null,
          role: { name: 'owner' },
        },
      });
      if (owners <= 1)
        throw new AppError(
          'LAST_OWNER_REQUIRED',
          'A empresa precisa manter ao menos um proprietário ativo.',
          HttpStatus.CONFLICT,
        );
    }
    const role = await this.role(dto.roleName);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { roleId: role.id, status: dto.status },
      });
      await tx.refreshToken.updateMany({
        where: {
          companyId: tenant.companyId,
          userId: membership.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(tx, {
        companyId: tenant.companyId,
        userId: tenant.userId,
        action:
          dto.status === 'removed' ? 'user.removed' : 'user.permission_changed',
        entityType: 'membership',
        entityId: membership.id,
        beforeData: {
          roleName: membership.role.name,
          status: membership.status,
        },
        afterData: { roleName: role.name, status: dto.status },
        reason: 'Alteração pela administração da empresa',
      });
      return updated;
    });
  }

  invitation(token: string) {
    return this.prisma.invitation.findFirst({
      where: { token, deletedAt: null, expiresAt: { gt: new Date() } },
      select: {
        email: true,
        expiresAt: true,
        company: { select: { name: true } },
        role: { select: { name: true } },
      },
    });
  }

  async acceptInvitation(token: string, dto: AcceptInvitationDto) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { token, deletedAt: null, expiresAt: { gt: new Date() } },
      include: { role: true },
    });
    if (!invitation)
      throw new AppError(
        'INVITATION_INVALID',
        'Este convite é inválido ou expirou.',
        HttpStatus.NOT_FOUND,
      );
    if (await this.findByEmail(invitation.email))
      throw new AppError(
        'INVITATION_LOGIN_REQUIRED',
        'Este e-mail já possui cadastro. Entre no sistema para acessar a empresa.',
        HttpStatus.CONFLICT,
      );
    const passwordHash = await this.hashPassword(dto.password);
    // O aceite é público por token e ainda não possui JWT; resolve o tenant a
    // partir do convite persistido antes de abrir a transação protegida por RLS.
    return this.prisma.withTenant(invitation.companyId, () =>
      this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: dto.name, email: invitation.email, passwordHash },
        });
        const membership = await tx.membership.create({
          data: {
            companyId: invitation.companyId,
            userId: user.id,
            roleId: invitation.roleId,
            status: 'active',
            createdBy: invitation.createdBy,
          },
        });
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { deletedAt: new Date() },
        });
        await this.audit.record(tx, {
          companyId: invitation.companyId,
          userId: user.id,
          action: 'user.invitation_accepted',
          entityType: 'membership',
          entityId: membership.id,
          afterData: {
            userId: user.id,
            email: user.email,
            roleName: invitation.role.name,
          },
        });
        return { accepted: true };
      }),
    );
  }

  private assertRoleAuthority(tenant: CurrentTenantContext, roleName: string) {
    if (roleName === 'owner' && tenant.roleName !== 'owner')
      throw new AppError(
        'OWNER_ROLE_RESTRICTED',
        'Somente o proprietário pode atribuir o perfil de proprietário.',
        HttpStatus.FORBIDDEN,
        'roleName',
      );
  }

  private async role(name: InviteUserDto['roleName']) {
    const role = await this.prisma.role.findUnique({ where: { name } });
    if (!role)
      throw new AppError(
        'ROLE_NOT_FOUND',
        'Perfil de acesso não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    return role;
  }
}

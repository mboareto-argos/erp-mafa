import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}

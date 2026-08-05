/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- respostas HTTP de supertest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { RoleName } from '@prisma/client';

// Troca o papel do usuário dono da sessão (só existe via Prisma direto nos
// testes — não há fluxo de convite/troca de papel implementado ainda) e
// devolve um novo access token já refletindo as permissões do papel novo
// (emitidas em /auth/select-company, TA-TENANT-002).
export async function switchRole(
  app: INestApplication,
  session: {
    credentials: { email: string; password: string };
    company: { id: string };
  },
  roleName: RoleName,
) {
  const prisma = app.get(PrismaService);
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: roleName },
  });
  await prisma.membership.updateMany({
    where: { companyId: session.company.id },
    data: { roleId: role.id },
  });

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({
      email: session.credentials.email,
      password: session.credentials.password,
    })
    .expect(200);

  const selected = await request(app.getHttpServer())
    .post('/api/v1/auth/select-company')
    .send({
      preauthToken: login.body.preauthToken,
      companyId: session.company.id,
    })
    .expect(200);

  return selected.body.accessToken as string;
}

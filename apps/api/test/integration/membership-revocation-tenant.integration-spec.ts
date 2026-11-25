/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP do supertest não são tipadas neste nível */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from './utils/test-app';
import { registerCompany, uniqueEmail } from './utils/auth-helpers';

// TA-SEC-001 / TA-TENANT-002: o acesso vale enquanto o vínculo com a empresa
// estiver ativo — o token já emitido não sobrevive à remoção.
describe('Revogação imediata de membro (multiempresa)', () => {
  let app: INestApplication;
  const password = 'senha-forte-123';
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());
  const READ_ROUTES = [
    '/auth/me',
    '/catalog/products',
    '/customers',
    '/sales',
    '/campaigns',
    '/payments/methods',
    '/inventory/balances',
  ];

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  async function selectCompany(email: string, companyId: string) {
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const selected = await http()
      .post('/api/v1/auth/select-company')
      .send({ preauthToken: login.body.preauthToken, companyId })
      .expect(200);
    return selected.body as { accessToken: string; refreshToken: string };
  }

  async function invite(ownerToken: string, email: string, roleName: string) {
    const invited = await http()
      .post('/api/v1/users/invitations')
      .set(auth(ownerToken))
      .send({ email, roleName })
      .expect(201);
    return invited.body as { invitation: { token: string } };
  }

  async function setMembership(
    ownerToken: string,
    email: string,
    body: { roleName: string; status: string },
  ) {
    const users = await http()
      .get('/api/v1/users')
      .set(auth(ownerToken))
      .expect(200);
    const membership = (
      users.body.memberships as { id: string; user: { email: string } }[]
    ).find((item) => item.user.email === email)!;
    await http()
      .patch(`/api/v1/users/${membership.id}`)
      .set(auth(ownerToken))
      .send(body)
      .expect(200);
  }

  async function setup(roleName = 'sales') {
    const owner = await registerCompany(app);
    const email = uniqueEmail('membro');
    const invited = await invite(owner.accessToken, email, roleName);
    await http()
      .post(`/api/v1/invitations/${invited.invitation.token}/accept`)
      .send({ name: 'Membro', password })
      .expect(201);
    const member = await selectCompany(email, owner.company.id);
    return { owner, email, member };
  }

  it('membro removido recebe 401 na hora em leitura, escrita e renovação; os demais seguem', async () => {
    const { owner, email, member } = await setup();
    for (const route of READ_ROUTES)
      await http()
        .get(`/api/v1${route}`)
        .set(auth(member.accessToken))
        .expect(200);

    await setMembership(owner.accessToken, email, {
      roleName: 'sales',
      status: 'removed',
    });

    for (const route of READ_ROUTES)
      await http()
        .get(`/api/v1${route}`)
        .set(auth(member.accessToken))
        .expect(401)
        .expect((res) => expect(res.body.error.code).toBe('SESSION_EXPIRED'));
    await http()
      .post('/api/v1/customers')
      .set(auth(member.accessToken))
      .send({ name: 'Não deve ser criado' })
      .expect(401);
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: member.refreshToken })
      .expect(401);

    // Controle positivo: a proprietária continua com o mesmo token, e nada
    // foi criado pelo membro removido.
    const customers = await http()
      .get('/api/v1/customers')
      .set(auth(owner.accessToken))
      .expect(200);
    expect(customers.body).toHaveLength(0);
  });

  it('remover de uma empresa não afeta o acesso da mesma pessoa em outra', async () => {
    const { owner, email, member } = await setup();
    const second = await registerCompany(app);
    await invite(second.accessToken, email, 'sales');
    const inSecond = await selectCompany(email, second.company.id);

    await setMembership(owner.accessToken, email, {
      roleName: 'sales',
      status: 'removed',
    });

    await http().get('/api/v1/sales').set(auth(member.accessToken)).expect(401);
    await http()
      .get('/api/v1/sales')
      .set(auth(inSecond.accessToken))
      .expect(200);
  });

  it('mudança de papel vale na hora, sem esperar o token expirar', async () => {
    const { owner, email, member } = await setup('sales');
    await setMembership(owner.accessToken, email, {
      roleName: 'viewer',
      status: 'active',
    });

    await http()
      .post('/api/v1/customers')
      .set(auth(member.accessToken))
      .send({ name: 'Sem permissão' })
      .expect(403);
    await http()
      .get('/api/v1/customers')
      .set(auth(member.accessToken))
      .expect(200);
  });

  it('usuário bloqueado perde o acesso na hora', async () => {
    const { email, member } = await setup();
    await app
      .get(PrismaService)
      .user.update({ where: { email }, data: { status: 'blocked' } });

    await http().get('/api/v1/sales').set(auth(member.accessToken)).expect(401);
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- respostas HTTP de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany, uniqueEmail } from './utils/auth-helpers';

describe('Configurações + usuários — fluxo completo (integração)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('edita configurações da empresa e preserva isolamento pelo token', async () => {
    const owner = await registerCompany(app);
    const other = await registerCompany(app);
    const body = {
      name: 'MAFA Piloto',
      document: '123456789',
      segment: 'Varejo',
      email: 'contato@mafa.local',
      phone: '11999999999',
      currency: 'BRL',
      timezone: 'America/Sao_Paulo',
      operationStartDate: '2026-08-01',
      brandAccentColor: '#C49A28',
      allowNegativeStock: false,
      allocationMethod: 'proportional_value',
      defaultMinStock: '2.5',
      discountLimit: '10',
    };
    await request(app.getHttpServer())
      .patch('/api/v1/company')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(body)
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe('MAFA Piloto');
        expect(res.body.defaultMinStock).toBe('2.5');
      });
    await request(app.getHttpServer())
      .get('/api/v1/company')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe(other.company.name);
      });
  });

  it('completa o ciclo de categoria e marca com auditoria e sem exclusão física', async () => {
    const owner = await registerCompany(app);
    const auth = { Authorization: `Bearer ${owner.accessToken}` };
    const category = await request(app.getHttpServer())
      .post('/api/v1/catalog/categories')
      .set(auth)
      .send({ name: 'Perfumes' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/catalog/categories/${category.body.id}`)
      .set(auth)
      .send({ name: 'Perfumaria' })
      .expect(200)
      .expect((res) => expect(res.body.name).toBe('Perfumaria'));
    await request(app.getHttpServer())
      .patch(`/api/v1/catalog/categories/${category.body.id}/deactivate`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/catalog/categories/${category.body.id}/reactivate`)
      .set(auth)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('active'));
    const brand = await request(app.getHttpServer())
      .post('/api/v1/catalog/brands')
      .set(auth)
      .send({ name: 'Marca A' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/catalog/brands/${brand.body.id}`)
      .set(auth)
      .send({ name: 'Marca Oficial' })
      .expect(200);
    const audit = await request(app.getHttpServer())
      .get('/api/v1/audit?entityType=category')
      .set(auth)
      .expect(200);
    const actions = (audit.body as { action: string }[]).map(
      (item) => item.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining([
        'category.created',
        'category.updated',
        'category.deactivated',
        'category.reactivated',
      ]),
    );
  });

  it('convida uma pessoa, aceita o convite e permite login na empresa correta', async () => {
    const owner = await registerCompany(app);
    const email = uniqueEmail('invited');
    const auth = { Authorization: `Bearer ${owner.accessToken}` };
    const invited = await request(app.getHttpServer())
      .post('/api/v1/users/invitations')
      .set(auth)
      .send({ email, roleName: 'sales' })
      .expect(201);
    expect(invited.body.type).toBe('invitation');
    await request(app.getHttpServer())
      .get(`/api/v1/invitations/${invited.body.invitation.token}`)
      .expect(200)
      .expect((res) => expect(res.body.email).toBe(email));
    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${invited.body.invitation.token}/accept`)
      .send({ name: 'Pessoa Convidada', password: 'senha-forte-123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'senha-forte-123' })
      .expect(200);
    expect(login.body.companies).toEqual([
      expect.objectContaining({
        companyId: owner.company.id,
        roleName: 'sales',
      }),
    ]);
    const selected = await request(app.getHttpServer())
      .post('/api/v1/auth/select-company')
      .send({
        preauthToken: login.body.preauthToken,
        companyId: owner.company.id,
      })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${selected.body.accessToken}`)
      .expect(403);
  });

  it('sessão de quem foi removido da equipe vira 401 em /auth/me (não 500)', async () => {
    const owner = await registerCompany(app);
    const auth = { Authorization: `Bearer ${owner.accessToken}` };
    const email = uniqueEmail('removed');
    const invited = await request(app.getHttpServer())
      .post('/api/v1/users/invitations')
      .set(auth)
      .send({ email, roleName: 'sales' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/invitations/${invited.body.invitation.token}/accept`)
      .send({ name: 'Pessoa Removida', password: 'senha-forte-123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'senha-forte-123' })
      .expect(200);
    const selected = await request(app.getHttpServer())
      .post('/api/v1/auth/select-company')
      .send({
        preauthToken: login.body.preauthToken,
        companyId: owner.company.id,
      })
      .expect(200);
    const memberAuth = {
      Authorization: `Bearer ${selected.body.accessToken}`,
    };
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set(memberAuth)
      .expect(200);

    const users = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set(auth)
      .expect(200);
    const { memberships } = users.body as {
      memberships: { id: string; user: { email: string } }[];
    };
    const membership = memberships.find((item) => item.user.email === email)!;
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${membership.id}`)
      .set(auth)
      .send({ roleName: 'sales', status: 'removed' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set(memberAuth)
      .expect(401)
      .expect((res) => expect(res.body.error.code).toBe('SESSION_EXPIRED'));
  });

  it('impede remover o próprio acesso e o último proprietário', async () => {
    const owner = await registerCompany(app);
    const auth = { Authorization: `Bearer ${owner.accessToken}` };
    const users = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${users.body.memberships[0].id}`)
      .set(auth)
      .send({ roleName: 'owner', status: 'removed' })
      .expect(409)
      .expect((res) => expect(res.body.error.code).toBe('CANNOT_REMOVE_SELF'));
  });
});

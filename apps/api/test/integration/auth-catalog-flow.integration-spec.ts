/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany, uniqueEmail } from './utils/auth-helpers';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Auth + Catalog — fluxo completo (integração)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra empresa+usuário e já devolve uma sessão utilizável', async () => {
    const session = await registerCompany(app);

    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.roleName).toBe('owner');
    expect(session.permissions).toEqual(
      expect.arrayContaining(['manage_catalog', 'view_catalog']),
    );

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.company.id).toBe(session.company.id);
        expect(res.body.user.email).toBe(session.user.email);
      });
  });

  it('rejeita e-mail já cadastrado com uma mensagem genérica de conflito', async () => {
    const email = uniqueEmail('duplicado');
    await registerCompany(app, { email });

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Outro',
        email,
        password: 'outra-senha-123',
        companyName: 'Outra Empresa',
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.error.code).toBe('EMAIL_IN_USE');
      });
  });

  it('login → select-company emite uma sessão válida só depois de cruzar com o Membership', async () => {
    const { credentials, company } = await registerCompany(app);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    expect(login.body.companies).toHaveLength(1);
    expect(login.body.companies[0].companyId).toBe(company.id);

    const selected = await request(app.getHttpServer())
      .post('/api/v1/auth/select-company')
      .send({ preauthToken: login.body.preauthToken, companyId: company.id })
      .expect(200);

    expect(selected.body.accessToken).toEqual(expect.any(String));

    // Nunca confia num companyId nao vinculado (TA-TENANT-002), mesmo com
    // token de pre-auth valido.
    await request(app.getHttpServer())
      .post('/api/v1/auth/select-company')
      .send({
        preauthToken: login.body.preauthToken,
        companyId: '00000000-0000-0000-0000-000000000000',
      })
      .expect(403);
  });

  it('rejeita senha incorreta sem revelar qual campo está errado (RN 10.1)', async () => {
    const { credentials } = await registerCompany(app);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'senha-errada' })
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejeita login de usuário bloqueado', async () => {
    const { credentials, user } = await registerCompany(app);
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'blocked' },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(403)
      .expect((res) => {
        expect(res.body.error.code).toBe('USER_BLOCKED');
      });
  });

  it('exige autenticação em endpoints de catálogo', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/catalog/categories')
      .expect(401);
  });

  it('cria categoria e produto (com variante e preço iniciais) e lista com o preço vigente', async () => {
    const session = await registerCompany(app);
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    const category = await request(app.getHttpServer())
      .post('/api/v1/catalog/categories')
      .set(auth)
      .send({ name: 'Perfumes' })
      .expect(201);

    const product = await request(app.getHttpServer())
      .post('/api/v1/catalog/products')
      .set(auth)
      .send({
        sku: 'SKU-TEST-1',
        name: 'Body Splash 200ml',
        unit: 'un',
        categoryId: category.body.id,
        salePrice: 39.9,
      })
      .expect(201);

    expect(product.body.variants).toHaveLength(1);
    expect(product.body.prices).toHaveLength(1);
    expect(product.body.prices[0].costPrice).toBe('0');

    const list = await request(app.getHttpServer())
      .get('/api/v1/catalog/products')
      .set(auth)
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].prices[0].salePrice).toBe('39.9');
  });

  it('rejeita custo digitado diretamente no cadastro do produto', async () => {
    const session = await registerCompany(app);

    await request(app.getHttpServer())
      .post('/api/v1/catalog/products')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        sku: 'SKU-TEST-2',
        name: 'Produto sem par',
        unit: 'un',
        salePrice: 39.9,
        referenceCost: 10,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
  });

  it('rejeita SKU duplicado dentro da mesma empresa', async () => {
    const session = await registerCompany(app);
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    await request(app.getHttpServer())
      .post('/api/v1/catalog/products')
      .set(auth)
      .send({ sku: 'SKU-DUP', name: 'Produto 1', unit: 'un' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/catalog/products')
      .set(auth)
      .send({ sku: 'SKU-DUP', name: 'Produto 2', unit: 'un' })
      .expect(409)
      .expect((res) => {
        expect(res.body.error.code).toBe('SKU_IN_USE');
      });
  });

  it('nunca apaga — inativar categoria só muda o status', async () => {
    const session = await registerCompany(app);
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    const category = await request(app.getHttpServer())
      .post('/api/v1/catalog/categories')
      .set(auth)
      .send({ name: 'Cremes' })
      .expect(201);

    const deactivated = await request(app.getHttpServer())
      .patch(`/api/v1/catalog/categories/${category.body.id}/deactivate`)
      .set(auth)
      .expect(200);

    expect(deactivated.body.status).toBe('inactive');

    const stillExists = await prisma.withTenant(session.company.id, () =>
      prisma.category.findUnique({ where: { id: category.body.id } }),
    );
    expect(stillExists).not.toBeNull();
    expect(stillExists?.deletedAt).toBeNull();
  });
});

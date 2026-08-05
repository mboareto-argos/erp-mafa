/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Imports — preview, confirmação, conciliação e reversão (Fase 6)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('devolve o modelo CSV com o cabeçalho esperado', async () => {
    const session = await registerCompany(app);
    const response = await request(app.getHttpServer())
      .get('/api/v1/imports/customer/template')
      .set(auth(session.accessToken))
      .expect(200);
    expect(response.text.trim()).toBe(
      'name,whatsapp,phone,email,instagram,birthDate',
    );
  });

  it('preview valida sem persistir e confirm cria a linha válida e rejeita a inválida', async () => {
    const session = await registerCompany(app);
    const csv =
      'name,whatsapp,phone,email,instagram,birthDate\nAna Souza,,,,,\n,,,,,\n';

    const preview = await request(app.getHttpServer())
      .post('/api/v1/imports/customer/preview')
      .set(auth(session.accessToken))
      .attach('file', Buffer.from(csv), 'clientes.csv')
      .expect(201);

    expect(preview.body.summary).toEqual({
      toCreate: 1,
      toReview: 0,
      toReject: 1,
    });
    expect(preview.body.rows[1].errors).toHaveProperty('name');

    const customersBefore = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(session.accessToken))
      .expect(200);
    expect(customersBefore.body).toHaveLength(0);

    const confirmed = await request(app.getHttpServer())
      .post('/api/v1/imports/customer/confirm')
      .set(auth(session.accessToken))
      .send({
        fileName: 'clientes.csv',
        rows: [{ cells: { name: 'Ana Souza' } }, { cells: { name: '' } }],
      })
      .expect(201);

    expect(confirmed.body.createdCount).toBe(1);
    expect(confirmed.body.rejectedCount).toBe(1);
    expect(confirmed.body.rows).toHaveLength(2);
    expect(confirmed.body.rows[0].status).toBe('created');
    expect(confirmed.body.rows[1].status).toBe('rejected');

    const customersAfter = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(session.accessToken))
      .expect(200);
    expect(customersAfter.body).toHaveLength(1);
    expect(customersAfter.body[0].name).toBe('Ana Souza');
  });

  it('reenvio da mesma Idempotency-Key no confirm não duplica a importação', async () => {
    const session = await registerCompany(app);
    const payload = {
      rows: [
        {
          cells: {
            name: 'Fornecedor Único',
            document: '',
            contactName: '',
            phone: '',
            whatsapp: '',
            email: '',
          },
        },
      ],
    };

    const first = await request(app.getHttpServer())
      .post('/api/v1/imports/supplier/confirm')
      .set(auth(session.accessToken))
      .set('Idempotency-Key', 'import-replay-1')
      .send(payload)
      .expect(201);

    const replayed = await request(app.getHttpServer())
      .post('/api/v1/imports/supplier/confirm')
      .set(auth(session.accessToken))
      .set('Idempotency-Key', 'import-replay-1')
      .send(payload)
      .expect(201);

    expect(replayed.body.id).toBe(first.body.id);

    const suppliers = await request(app.getHttpServer())
      .get('/api/v1/purchasing/suppliers')
      .set(auth(session.accessToken))
      .expect(200);
    expect(suppliers.body).toHaveLength(1);
  });

  it('RN-IMP-002: duplicidade de produto por SKU exige duplicateAction, e "use_existing" não cria um novo produto', async () => {
    const session = await registerCompany(app);
    const existing = await createProduct(app, session.accessToken, {
      sku: 'SKU-DUP-1',
    });

    const preview = await request(app.getHttpServer())
      .post('/api/v1/imports/product/preview')
      .set(auth(session.accessToken))
      .attach(
        'file',
        Buffer.from(
          'sku,name,unit,minStock,salePrice\nSKU-DUP-1,Nome Novo,un,,\n',
        ),
        'produtos.csv',
      )
      .expect(201);
    expect(preview.body.rows[0].duplicateMatch).toMatchObject({
      entityId: existing.id,
      matchedBy: 'sku',
    });

    const rejected = await request(app.getHttpServer())
      .post('/api/v1/imports/product/confirm')
      .set(auth(session.accessToken))
      .send({
        rows: [{ cells: { sku: 'SKU-DUP-1', name: 'Nome Novo', unit: 'un' } }],
      })
      .expect(201);
    expect(rejected.body.rejectedCount).toBe(1);

    const skipped = await request(app.getHttpServer())
      .post('/api/v1/imports/product/confirm')
      .set(auth(session.accessToken))
      .send({
        rows: [
          {
            cells: { sku: 'SKU-DUP-1', name: 'Nome Novo', unit: 'un' },
            duplicateAction: 'use_existing',
          },
        ],
      })
      .expect(201);
    expect(skipped.body.skippedCount).toBe(1);
    expect(skipped.body.rows[0].resultEntityId).toBe(existing.id);

    const products = await request(app.getHttpServer())
      .get('/api/v1/catalog/products')
      .set(auth(session.accessToken))
      .expect(200);
    expect(products.body).toHaveLength(1);
  });

  it('estoque inicial gera movimentação e fixa o custo (RN 10.19.8)', async () => {
    const session = await registerCompany(app);
    const product = await createProduct(app, session.accessToken, {
      sku: 'SKU-INIT-1',
    });

    const confirmed = await request(app.getHttpServer())
      .post('/api/v1/imports/initial_stock/confirm')
      .set(auth(session.accessToken))
      .send({
        rows: [
          { cells: { sku: 'SKU-INIT-1', quantity: '10', unitCost: '25.5' } },
        ],
      })
      .expect(201);
    expect(confirmed.body.createdCount).toBe(1);

    const balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    expect(balances.body).toHaveLength(1);
    expect(balances.body[0].quantityAvailable).toBe('10');

    const products = await request(app.getHttpServer())
      .get('/api/v1/catalog/products')
      .set(auth(session.accessToken))
      .expect(200);
    const productList = products.body as Array<{
      id: string;
      prices: Array<{ costPrice: string }>;
    }>;
    const updatedProduct = productList.find((p) => p.id === product.id);
    expect(updatedProduct?.prices[0].costPrice).toBe('25.5');
  });

  it('estoque inicial rejeita SKU que ainda não foi importado/cadastrado', async () => {
    const session = await registerCompany(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/imports/initial_stock/confirm')
      .set(auth(session.accessToken))
      .send({
        rows: [
          { cells: { sku: 'SKU-INEXISTENTE', quantity: '5', unitCost: '10' } },
        ],
      })
      .expect(201);
    expect(response.body.rejectedCount).toBe(1);
    expect(response.body.rows[0].errors).toHaveProperty('sku');
  });

  it('reconciliação: sinaliza divergência quando o total esperado não bate com o importado', async () => {
    const session = await registerCompany(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/imports/payable/confirm')
      .set(auth(session.accessToken))
      .send({
        rows: [
          {
            cells: {
              description: 'Conta 1',
              amountOriginal: '100',
              dueDate: '2026-09-01',
            },
          },
        ],
        expectedTotal: 150,
      })
      .expect(201);

    expect(response.body.reconciledTotal).toBe('100');
    expect(response.body.expectedTotal).toBe('150');
    expect(response.body.divergence).toBe('-50');
  });

  it('revert desativa as entidades criadas e nunca apaga a linha (TA-DATA-001)', async () => {
    const session = await registerCompany(app);
    const confirmed = await request(app.getHttpServer())
      .post('/api/v1/imports/customer/confirm')
      .set(auth(session.accessToken))
      .send({ rows: [{ cells: { name: 'Cliente Reversível' } }] })
      .expect(201);
    const createdCustomerId = confirmed.body.rows[0].resultEntityId;

    const reverted = await request(app.getHttpServer())
      .post(`/api/v1/imports/${confirmed.body.id}/revert`)
      .set(auth(session.accessToken))
      .expect(201);
    expect(reverted.body.status).toBe('reverted');

    const customer = await prisma.withTenant(session.company.id, () =>
      prisma.customer.findUnique({ where: { id: createdCustomerId } }),
    );
    expect(customer).not.toBeNull();
    expect(customer?.status).toBe('inactive');
    expect(customer?.deletedAt).toBeNull();

    await request(app.getHttpServer())
      .post(`/api/v1/imports/${confirmed.body.id}/revert`)
      .set(auth(session.accessToken))
      .expect(409);
  });

  it('vendedor sem permission:manage_imports recebe 403', async () => {
    const session = await registerCompany(app);
    const prisma2 = app.get(PrismaService);
    const salesRole = await prisma2.role.findUniqueOrThrow({
      where: { name: 'sales' },
    });
    await prisma2.membership.updateMany({
      where: { companyId: session.company.id },
      data: { roleId: salesRole.id },
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

    await request(app.getHttpServer())
      .get('/api/v1/imports')
      .set(auth(selected.body.accessToken))
      .expect(403);
  });

  it('isolamento multiempresa: empresa B não vê nem reverte importação da empresa A', async () => {
    const companyA = await registerCompany(app, { companyName: 'Import A' });
    const companyB = await registerCompany(app, { companyName: 'Import B' });

    const confirmed = await request(app.getHttpServer())
      .post('/api/v1/imports/customer/confirm')
      .set(auth(companyA.accessToken))
      .send({ rows: [{ cells: { name: 'Cliente A' } }] })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/imports/${confirmed.body.id}`)
      .set(auth(companyB.accessToken))
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/imports/${confirmed.body.id}/revert`)
      .set(auth(companyB.accessToken))
      .expect(404);

    const listAsB = await request(app.getHttpServer())
      .get('/api/v1/imports')
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(listAsB.body).toHaveLength(0);
  });
});

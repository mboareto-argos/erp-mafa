/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';
import { PrismaService } from '../../src/prisma/prisma.service';

// TA-TENANT-004: Inventory é módulo crítico (docs/architecture/overview.md
// §8.3) — cenário com duas empresas garantindo que uma nunca enxerga nem
// altera saldo/compra da outra.
describe('Isolamento multiempresa — Inventory e Purchasing', () => {
  let app: INestApplication;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('empresa B nunca vê o saldo de estoque nem os movimentos da empresa A', async () => {
    const companyA = await registerCompany(app, { companyName: 'Estoque A' });
    const companyB = await registerCompany(app, { companyName: 'Estoque B' });
    const productA = await createProduct(app, companyA.accessToken);
    const variantIdA = productA.variants[0].id;

    const adjustment = {
      productVariantId: variantIdA,
      quantity: 10,
      reason: 'Estoque inicial',
    };
    const firstAdjustment = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set(auth(companyA.accessToken))
      .set('Idempotency-Key', 'tenant-adjustment-replay')
      .send(adjustment)
      .expect(201);

    const replayedAdjustment = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set(auth(companyA.accessToken))
      .set('Idempotency-Key', 'tenant-adjustment-replay')
      .send(adjustment)
      .expect(201);
    expect(replayedAdjustment.body).toEqual(firstAdjustment.body);

    const auditLogs = await app.get(PrismaService).auditLog.findMany({
      where: { companyId: companyA.company.id, action: 'stock.adjusted' },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      entityType: 'stock_adjustment',
      reason: 'Estoque inicial',
    });

    const balancesAsB = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(balancesAsB.body).toHaveLength(0);

    const movementsAsB = await request(app.getHttpServer())
      .get('/api/v1/inventory/movements')
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(movementsAsB.body).toHaveLength(0);
  });

  it('empresa B não consegue ajustar estoque de uma variante da empresa A', async () => {
    const companyA = await registerCompany(app, { companyName: 'Estoque A2' });
    const companyB = await registerCompany(app, { companyName: 'Estoque B2' });
    const productA = await createProduct(app, companyA.accessToken);

    const response = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set(auth(companyB.accessToken))
      .send({
        productVariantId: productA.variants[0].id,
        quantity: 10,
        reason: 'Tentativa cross-tenant',
      })
      .expect(404);
    expect(response.body.error.code).toBe('PRODUCT_VARIANT_NOT_FOUND');

    const balancesAsA = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(companyA.accessToken))
      .expect(200);
    expect(balancesAsA.body).toHaveLength(0);
  });

  it('empresa B não vê nem consegue operar uma compra da empresa A', async () => {
    const companyA = await registerCompany(app, { companyName: 'Compras A' });
    const companyB = await registerCompany(app, { companyName: 'Compras B' });
    const productA = await createProduct(app, companyA.accessToken);

    const purchase = await request(app.getHttpServer())
      .post('/api/v1/purchasing/purchases')
      .set(auth(companyA.accessToken))
      .send({
        items: [
          {
            productVariantId: productA.variants[0].id,
            quantity: 5,
            unitCostOriginCurrency: 10,
          },
        ],
      })
      .expect(201);

    const listAsB = await request(app.getHttpServer())
      .get('/api/v1/purchasing/purchases')
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(listAsB.body).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/api/v1/purchasing/purchases/${purchase.body.id}`)
      .set(auth(companyB.accessToken))
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchase.body.id}/order`)
      .set(auth(companyB.accessToken))
      .expect(404);
  });
});

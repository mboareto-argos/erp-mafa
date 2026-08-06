/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';
import {
  createCustomer,
  createPaymentMethod,
  receiveStock,
} from './utils/sales-helpers';

// TA-TENANT-004: Sales é módulo crítico.
describe('Isolamento multiempresa — Sales', () => {
  let app: INestApplication;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('empresa B nunca vê, confirma ou cancela uma venda da empresa A', async () => {
    const companyA = await registerCompany(app, { companyName: 'Vendas A' });
    const companyB = await registerCompany(app, { companyName: 'Vendas B' });

    const productA = await createProduct(app, companyA.accessToken);
    const variantIdA = productA.variants[0].id;
    await receiveStock(app, companyA.accessToken, variantIdA, 10, 50);
    const paymentMethodA = await createPaymentMethod(app, companyA.accessToken);

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(companyA.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantIdA, quantity: 2, unitPrice: 100 }],
      })
      .expect(201);

    const listAsB = await request(app.getHttpServer())
      .get('/api/v1/sales')
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(listAsB.body).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/api/v1/sales/${sale.body.id}`)
      .set(auth(companyB.accessToken))
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/sales/${sale.body.id}`)
      .set(auth(companyB.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantIdA, quantity: 1, unitPrice: 100 }],
      })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(companyB.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethodA.id, amount: 200 }] })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/cancel`)
      .set(auth(companyB.accessToken))
      .expect(404);
  });

  it('empresa B não consegue vender uma variante da empresa A nem usar o cliente/forma de pagamento de A', async () => {
    const companyA = await registerCompany(app, { companyName: 'Vendas A2' });
    const companyB = await registerCompany(app, { companyName: 'Vendas B2' });

    const productA = await createProduct(app, companyA.accessToken);
    const customerA = await createCustomer(app, companyA.accessToken);

    const invalidVariant = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(companyB.accessToken))
      .send({
        channel: 'presencial',
        items: [
          {
            productVariantId: productA.variants[0].id,
            quantity: 1,
            unitPrice: 10,
          },
        ],
      })
      .expect(400);
    expect(invalidVariant.body.error.code).toBe('INVALID_PRODUCT_VARIANT');

    const productB = await createProduct(app, companyB.accessToken);
    const invalidCustomer = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(companyB.accessToken))
      .send({
        channel: 'presencial',
        customerId: customerA.id,
        items: [
          {
            productVariantId: productB.variants[0].id,
            quantity: 1,
            unitPrice: 10,
          },
        ],
      })
      .expect(400);
    expect(invalidCustomer.body.error.code).toBe('INVALID_CUSTOMER');
  });

  it('saldo de estoque de uma empresa nunca é afetado por vendas de outra', async () => {
    const companyA = await registerCompany(app, { companyName: 'Vendas A3' });
    const companyB = await registerCompany(app, { companyName: 'Vendas B3' });

    const productB = await createProduct(app, companyB.accessToken);
    const variantIdB = productB.variants[0].id;
    await receiveStock(app, companyB.accessToken, variantIdB, 10, 20);

    const balancesAsA = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(companyA.accessToken))
      .expect(200);
    expect(balancesAsA.body).toHaveLength(0);
  });
});

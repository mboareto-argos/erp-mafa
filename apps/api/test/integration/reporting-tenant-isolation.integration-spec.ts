/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';
import { createPaymentMethod, receiveStock } from './utils/sales-helpers';

// TA-TENANT-004: os números de uma empresa nunca aparecem nos relatórios de
// outra.
describe('Isolamento multiempresa — Reporting', () => {
  let app: INestApplication;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const from = '2026-08-01';
  const to = '2026-08-31';

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('dashboard/relatórios da empresa B nunca refletem vendas/estoque da empresa A', async () => {
    const companyA = await registerCompany(app, { companyName: 'Reporting A' });
    const companyB = await registerCompany(app, { companyName: 'Reporting B' });

    const productA = await createProduct(app, companyA.accessToken);
    const variantIdA = productA.variants[0].id;
    await receiveStock(app, companyA.accessToken, variantIdA, 10, 50);
    const paymentMethodA = await createPaymentMethod(app, companyA.accessToken);

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(companyA.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantIdA, quantity: 3, unitPrice: 100 }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(companyA.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethodA.id, amount: 300 }] })
      .expect(201);

    const dashboardAsB = await request(app.getHttpServer())
      .get(`/api/v1/reporting/dashboard?from=${from}&to=${to}`)
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(dashboardAsB.body.revenueNet).toBe('0');
    expect(dashboardAsB.body.salesCount).toBe(0);
    expect(dashboardAsB.body.inventoryValue).toBe('0');
    expect(dashboardAsB.body.productsCount).toBe(0);

    const salesReportAsB = await request(app.getHttpServer())
      .get(`/api/v1/reporting/sales?from=${from}&to=${to}`)
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(salesReportAsB.body.sales).toHaveLength(0);

    const topProductsAsB = await request(app.getHttpServer())
      .get(`/api/v1/reporting/top-products?from=${from}&to=${to}`)
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(topProductsAsB.body.products).toHaveLength(0);

    const inventoryValueAsB = await request(app.getHttpServer())
      .get('/api/v1/reporting/inventory-value')
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(inventoryValueAsB.body.total).toBe('0');
  });
});

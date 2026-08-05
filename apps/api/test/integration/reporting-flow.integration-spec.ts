/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';
import { createPaymentMethod, receiveStock } from './utils/sales-helpers';
import { createFinancialAccount } from './utils/finance-helpers';
import { switchRole } from './utils/role-helpers';

describe('Reporting — dashboard e relatórios (integração)', () => {
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

  async function setupSaleAndExpense() {
    const session = await registerCompany(app);
    const product = await createProduct(app, session.accessToken);
    const variantId = product.variants[0].id as string;
    await receiveStock(app, session.accessToken, variantId, 10, 50);
    const paymentMethod = await createPaymentMethod(app, session.accessToken);

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 3, unitPrice: 100 }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 300 }] })
      .expect(201);

    const account = await createFinancialAccount(app, session.accessToken);
    await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set(auth(session.accessToken))
      .send({
        description: 'Embalagens',
        category: 'embalagem',
        amount: 50,
        competenceDate: '2026-08-04',
        paidNow: true,
        financialAccountId: account.id,
      })
      .expect(201);

    return { session, product };
  }

  it('dashboard reflete faturamento, CMV, lucro, despesas e estoque exatos do período', async () => {
    const { session } = await setupSaleAndExpense();

    const dashboard = await request(app.getHttpServer())
      .get(`/api/v1/reporting/dashboard?from=${from}&to=${to}`)
      .set(auth(session.accessToken))
      .expect(200);

    expect(dashboard.body.revenueNet).toBe('300');
    expect(dashboard.body.salesCount).toBe(1);
    expect(dashboard.body.averageTicket).toBe('300');
    expect(dashboard.body.expensesRealized).toBe('50');
    expect(dashboard.body.cmv).toBe('150');
    expect(dashboard.body.grossProfit).toBe('150');
    expect(dashboard.body.netProfitEstimated).toBe('100');
    expect(dashboard.body.margin).toBe('50');
    expect(dashboard.body.inventoryValue).toBe('350'); // 7 restantes x 50
    expect(dashboard.body.productsCount).toBe(1);
  });

  it('DRE gerencial bate com o esperado (receita líquida - CMV - despesas)', async () => {
    const { session } = await setupSaleAndExpense();

    const dre = await request(app.getHttpServer())
      .get(`/api/v1/reporting/dre?from=${from}&to=${to}`)
      .set(auth(session.accessToken))
      .expect(200);

    expect(dre.body.netRevenue).toBe('300');
    expect(dre.body.cmv).toBe('150');
    expect(dre.body.grossProfit).toBe('150');
    expect(dre.body.expenses).toBe('50');
    expect(dre.body.netProfit).toBe('100');
  });

  it('top-products lista o produto vendido com quantidade e lucro corretos', async () => {
    const { session, product } = await setupSaleAndExpense();

    const response = await request(app.getHttpServer())
      .get(`/api/v1/reporting/top-products?from=${from}&to=${to}`)
      .set(auth(session.accessToken))
      .expect(200);

    expect(response.body.products).toHaveLength(1);
    expect(response.body.products[0].productId).toBe(product.id);
    expect(response.body.products[0].quantitySold).toBe('3');
    expect(response.body.products[0].profit).toBe('150');
  });

  it('exige período (from/to) nos relatórios que dependem dele', async () => {
    const session = await registerCompany(app);

    const response = await request(app.getHttpServer())
      .get('/api/v1/reporting/dashboard')
      .set(auth(session.accessToken))
      .expect(400);
    expect(response.body.error.code).toBe('MISSING_PERIOD');
  });

  it('inventory-value não exige período (é uma foto do momento atual)', async () => {
    const { session } = await setupSaleAndExpense();

    const response = await request(app.getHttpServer())
      .get('/api/v1/reporting/inventory-value')
      .set(auth(session.accessToken))
      .expect(200);
    expect(response.body.total).toBe('350');
  });

  it('viewer (view_reports sem view_profit) nunca recebe cmv/grossProfit/margin no dashboard (RN 10.17.2)', async () => {
    const { session } = await setupSaleAndExpense();
    const viewerToken = await switchRole(app, session, 'viewer');

    const dashboard = await request(app.getHttpServer())
      .get(`/api/v1/reporting/dashboard?from=${from}&to=${to}`)
      .set(auth(viewerToken))
      .expect(200);

    expect(dashboard.body.cmv).toBeUndefined();
    expect(dashboard.body.grossProfit).toBeUndefined();
    expect(dashboard.body.netProfitEstimated).toBeUndefined();
    expect(dashboard.body.margin).toBeUndefined();
    // Indicadores não-financeiros continuam disponíveis.
    expect(dashboard.body.revenueNet).toBe('300');
  });

  it('vendedor não tem permission:view_reports — 403 em qualquer endpoint do módulo', async () => {
    const session = await registerCompany(app);
    const salesToken = await switchRole(app, session, 'sales');

    await request(app.getHttpServer())
      .get(`/api/v1/reporting/dashboard?from=${from}&to=${to}`)
      .set(auth(salesToken))
      .expect(403);
  });
});

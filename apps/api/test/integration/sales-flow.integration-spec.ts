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

describe('Sales — fluxo completo à vista (integração)', () => {
  let app: INestApplication;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setup(stockQuantity = 10, unitCost = 50) {
    const session = await registerCompany(app);
    const product = await createProduct(app, session.accessToken);
    const variantId = product.variants[0].id as string;
    await receiveStock(
      app,
      session.accessToken,
      variantId,
      stockQuantity,
      unitCost,
    );
    const customer = await createCustomer(app, session.accessToken);
    const paymentMethod = await createPaymentMethod(app, session.accessToken);
    return { session, variantId, customer, paymentMethod };
  }

  it('rascunho não altera o estoque (RN 10.10.1)', async () => {
    const { session, variantId, customer } = await setup();

    await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        customerId: customer.id,
        items: [{ productVariantId: variantId, quantity: 2, unitPrice: 100 }],
      })
      .expect(201)
      .expect((res) => expect(res.body.status).toBe('draft'));

    const balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    expect(balances.body[0].quantityAvailable).toBe('10');
  });

  it('confirmar baixa estoque, congela custo e calcula CMV/lucro', async () => {
    const { session, variantId, paymentMethod } = await setup();

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 3, unitPrice: 100 }],
      })
      .expect(201);
    expect(sale.body.total).toBe('300');

    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 300 }] })
      .expect(201);

    expect(confirmed.body.status).toBe('confirmed');
    expect(confirmed.body.items[0].unitCostAtSale).toBe('50');
    expect(confirmed.body.cmvCalculated).toBe('150');
    expect(confirmed.body.grossProfitCalculated).toBe('150');
    expect(confirmed.body.payments[0].amount).toBe('300');

    const balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    expect(balances.body[0].quantityAvailable).toBe('7');
  });

  it('não confirma com estoque insuficiente, e não baixa nada', async () => {
    const { session, variantId, paymentMethod } = await setup(5, 50);

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 999, unitPrice: 100 }],
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .send({
        payments: [{ paymentMethodId: paymentMethod.id, amount: 99900 }],
      })
      .expect(400);
    expect(response.body.error.code).toBe('STOCK_INSUFFICIENT');

    const balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    expect(balances.body[0].quantityAvailable).toBe('5');
  });

  it('rejeita confirmação quando a soma dos pagamentos não bate com o total', async () => {
    const { session, variantId, paymentMethod } = await setup();

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 2, unitPrice: 100 }],
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 50 }] })
      .expect(400);
    expect(response.body.error.code).toBe('PAYMENT_AMOUNT_MISMATCH');
  });

  it('cancelar venda confirmada restaura o estoque (RN 10.10.15)', async () => {
    const { session, variantId, paymentMethod } = await setup();

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 4, unitPrice: 100 }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 400 }] })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/cancel`)
      .set(auth(session.accessToken))
      .expect(201)
      .expect((res) => expect(res.body.status).toBe('cancelled'));

    const balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    expect(balances.body[0].quantityAvailable).toBe('10');
  });

  it('devolução parcial (item apto) restaura parte do estoque e recalcula CMV/lucro (RN 10.11.8)', async () => {
    const { session, variantId, paymentMethod } = await setup();

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 4, unitPrice: 100 }],
      })
      .expect(201);
    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 400 }] })
      .expect(201);
    const itemId = confirmed.body.items[0].id;

    const returned = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/return`)
      .set(auth(session.accessToken))
      .send({
        reason: 'Cliente desistiu de uma unidade',
        items: [{ saleItemId: itemId, quantity: 1, condition: 'apt' }],
      })
      .expect(201);

    expect(returned.body.status).toBe('partially_returned');
    expect(returned.body.total).toBe('300');
    expect(returned.body.cmvCalculated).toBe('150');
    expect(returned.body.grossProfitCalculated).toBe('150');

    const balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    expect(balances.body[0].quantityAvailable).toBe('7');
  });

  it('devolução de item avariado não restaura o estoque', async () => {
    const { session, variantId, paymentMethod } = await setup();

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 2, unitPrice: 100 }],
      })
      .expect(201);
    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 200 }] })
      .expect(201);
    const itemId = confirmed.body.items[0].id;

    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/return`)
      .set(auth(session.accessToken))
      .send({
        reason: 'Produto quebrado',
        items: [{ saleItemId: itemId, quantity: 2, condition: 'damaged' }],
      })
      .expect(201)
      .expect((res) => expect(res.body.status).toBe('returned'));

    const balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    // 10 - 2 vendidas = 8, avariado não volta.
    expect(balances.body[0].quantityAvailable).toBe('8');
  });

  it('não permite devolver mais do que ainda não foi devolvido', async () => {
    const { session, variantId, paymentMethod } = await setup();

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 2, unitPrice: 100 }],
      })
      .expect(201);
    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 200 }] })
      .expect(201);
    const itemId = confirmed.body.items[0].id;

    const response = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/return`)
      .set(auth(session.accessToken))
      .send({
        reason: 'Devolução exagerada',
        items: [{ saleItemId: itemId, quantity: 3, condition: 'apt' }],
      })
      .expect(400);
    expect(response.body.error.code).toBe('RETURN_QUANTITY_EXCEEDS_SOLD');
  });
});

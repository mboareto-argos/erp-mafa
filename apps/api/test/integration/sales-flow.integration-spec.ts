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
    const account = await request(app.getHttpServer())
      .post('/api/v1/financial-accounts')
      .set(auth(session.accessToken))
      .send({ name: 'Caixa da loja' })
      .expect(201);
    const paymentMethod = await createPaymentMethod(app, session.accessToken, {
      financialAccountId: account.body.id,
    });
    return { session, variantId, customer, paymentMethod, account: account.body };
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

  it('edita apenas o rascunho, substitui itens sem apagar histórico e recalcula totais', async () => {
    const { session, variantId, customer } = await setup();
    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({ channel: 'presencial', items: [{ productVariantId: variantId, quantity: 2, unitPrice: 100 }] })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/sales/${sale.body.id}`)
      .set(auth(session.accessToken))
      .send({ channel: 'whatsapp', customerId: customer.id, discount: 10, items: [{ productVariantId: variantId, quantity: 3, unitPrice: 120 }] })
      .expect(200);

    expect(updated.body.status).toBe('draft');
    expect(updated.body.channel).toBe('whatsapp');
    expect(updated.body.items).toHaveLength(1);
    expect(updated.body.subtotal).toBe('360');
    expect(updated.body.total).toBe('350');
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

  it('confirma venda a prazo e gera a agenda de recebíveis sem diferença de centavos', async () => {
    const { session, variantId, customer } = await setup();
    const sale = await request(app.getHttpServer()).post('/api/v1/sales').set(auth(session.accessToken)).send({ channel: 'presencial', customerId: customer.id, items: [{ productVariantId: variantId, quantity: 1, unitPrice: 100 }] }).expect(201);
    const confirmed = await request(app.getHttpServer()).post(`/api/v1/sales/${sale.body.id}/confirm`).set(auth(session.accessToken)).send({ payments: [], installmentPlan: { count: 3, firstDueDate: '2026-09-10' } }).expect(201);
    expect(confirmed.body.receivables.map((item: { amountOriginal: string }) => item.amountOriginal)).toEqual(['33.33', '33.33', '33.34']);
    expect(confirmed.body.receivables.map((item: { dueDate: string }) => item.dueDate.slice(0, 10))).toEqual(['2026-09-10', '2026-10-10', '2026-11-10']);
  });

  it('cancelar venda confirmada restaura estoque e estorna o caixa (RN 10.10.15)', async () => {
    const { session, variantId, paymentMethod, account } = await setup();

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

    const transactions = await request(app.getHttpServer())
      .get(`/api/v1/cash-flow/transactions?financialAccountId=${account.id}`)
      .set(auth(session.accessToken))
      .expect(200);
    expect(transactions.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'in', amount: '400' }),
        expect.objectContaining({ type: 'out', amount: '-400' }),
      ]),
    );
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

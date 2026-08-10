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

describe('Estoque reservado + em trânsito (integração)', () => {
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

  async function getBalance(session: { accessToken: string }) {
    const balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    return balances.body[0];
  }

  async function getMovements(
    session: { accessToken: string },
    variantId: string,
  ) {
    const movements = await request(app.getHttpServer())
      .get(`/api/v1/inventory/movements?productVariantId=${variantId}`)
      .set(auth(session.accessToken))
      .expect(200);
    return movements.body;
  }

  describe('Reserva de venda', () => {
    it('reservar com cliente move disponível para reservado sem alterar o físico', async () => {
      const { session, variantId, customer } = await setup();

      const sale = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set(auth(session.accessToken))
        .send({
          channel: 'presencial',
          customerId: customer.id,
          items: [{ productVariantId: variantId, quantity: 3, unitPrice: 100 }],
        })
        .expect(201);

      const reserved = await request(app.getHttpServer())
        .post(`/api/v1/sales/${sale.body.id}/reserve`)
        .set(auth(session.accessToken))
        .expect(201);
      expect(reserved.body.status).toBe('reserved');

      const balance = await getBalance(session);
      expect(balance.quantityAvailable).toBe('7');
      expect(balance.quantityReserved).toBe('3');

      const movements = await getMovements(session, variantId);
      expect(movements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'reservation', quantity: '3' }),
        ]),
      );
    });

    it('não reserva sem cliente definido', async () => {
      const { session, variantId } = await setup();

      const sale = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set(auth(session.accessToken))
        .send({
          channel: 'presencial',
          items: [{ productVariantId: variantId, quantity: 1, unitPrice: 100 }],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/sales/${sale.body.id}/reserve`)
        .set(auth(session.accessToken))
        .expect(400);
      expect(response.body.error.code).toBe('CUSTOMER_REQUIRED_FOR_RESERVATION');
    });

    it('não reserva quantidade acima do disponível', async () => {
      const { session, variantId, customer } = await setup(5, 50);

      const sale = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set(auth(session.accessToken))
        .send({
          channel: 'presencial',
          customerId: customer.id,
          items: [{ productVariantId: variantId, quantity: 999, unitPrice: 100 }],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/sales/${sale.body.id}/reserve`)
        .set(auth(session.accessToken))
        .expect(400);
      expect(response.body.error.code).toBe('STOCK_INSUFFICIENT');

      const balance = await getBalance(session);
      expect(balance.quantityAvailable).toBe('5');
      expect(balance.quantityReserved).toBe('0');
    });

    it('confirmar venda reservada converte a reserva em saída (efeito líquido igual a uma confirmação normal)', async () => {
      const { session, variantId, customer, paymentMethod } = await setup();

      const sale = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set(auth(session.accessToken))
        .send({
          channel: 'presencial',
          customerId: customer.id,
          items: [{ productVariantId: variantId, quantity: 3, unitPrice: 100 }],
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/sales/${sale.body.id}/reserve`)
        .set(auth(session.accessToken))
        .expect(201);

      const confirmed = await request(app.getHttpServer())
        .post(`/api/v1/sales/${sale.body.id}/confirm`)
        .set(auth(session.accessToken))
        .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 300 }] })
        .expect(201);
      expect(confirmed.body.status).toBe('confirmed');
      expect(confirmed.body.items[0].unitCostAtSale).toBe('50');

      const balance = await getBalance(session);
      expect(balance.quantityAvailable).toBe('7');
      expect(balance.quantityReserved).toBe('0');

      const movements = await getMovements(session, variantId);
      expect(movements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'out', quantity: '-3' }),
        ]),
      );
    });

    it('cancelar venda reservada libera a reserva sem mexer no disponível', async () => {
      const { session, variantId, customer } = await setup();

      const sale = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set(auth(session.accessToken))
        .send({
          channel: 'presencial',
          customerId: customer.id,
          items: [{ productVariantId: variantId, quantity: 3, unitPrice: 100 }],
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/sales/${sale.body.id}/reserve`)
        .set(auth(session.accessToken))
        .expect(201);

      const cancelled = await request(app.getHttpServer())
        .post(`/api/v1/sales/${sale.body.id}/cancel`)
        .set(auth(session.accessToken))
        .expect(201);
      expect(cancelled.body.status).toBe('cancelled');

      const balance = await getBalance(session);
      expect(balance.quantityAvailable).toBe('10');
      expect(balance.quantityReserved).toBe('0');

      const movements = await getMovements(session, variantId);
      expect(movements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'release', quantity: '-3' }),
        ]),
      );
    });
  });

  describe('Compra em trânsito', () => {
    it('pedido marca a quantidade como em trânsito sem afetar o disponível', async () => {
      const { session, variantId } = await setup();

      const purchase = await request(app.getHttpServer())
        .post('/api/v1/purchasing/purchases')
        .set(auth(session.accessToken))
        .send({
          items: [
            { productVariantId: variantId, quantity: 5, unitCostOriginCurrency: 50 },
          ],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/purchasing/purchases/${purchase.body.id}/order`)
        .set(auth(session.accessToken))
        .expect(201);

      const balances = await request(app.getHttpServer())
        .get('/api/v1/inventory/balances')
        .set(auth(session.accessToken));
      const balance = balances.body.find(
        (b: { productVariantId: string }) => b.productVariantId === variantId,
      );
      expect(balance.quantityInTransit).toBe('5');
      expect(balance.quantityAvailable).toBe('10');
    });

    it('recebimento total zera o em trânsito e soma no disponível', async () => {
      const { session, variantId } = await setup();

      const purchase = await request(app.getHttpServer())
        .post('/api/v1/purchasing/purchases')
        .set(auth(session.accessToken))
        .send({
          items: [
            { productVariantId: variantId, quantity: 5, unitCostOriginCurrency: 50 },
          ],
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/purchasing/purchases/${purchase.body.id}/order`)
        .set(auth(session.accessToken))
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/purchasing/purchases/${purchase.body.id}/receive`)
        .set(auth(session.accessToken))
        .send({
          items: [
            { purchaseItemId: purchase.body.items[0].id, quantityReceived: 5 },
          ],
        })
        .expect(201);

      const balance = await getBalance(session);
      expect(balance.quantityInTransit).toBe('0');
      expect(balance.quantityAvailable).toBe('15');
    });

    it('recebimento parcial só desconta a parte recebida do em trânsito', async () => {
      const { session, variantId } = await setup();

      const purchase = await request(app.getHttpServer())
        .post('/api/v1/purchasing/purchases')
        .set(auth(session.accessToken))
        .send({
          items: [
            { productVariantId: variantId, quantity: 10, unitCostOriginCurrency: 50 },
          ],
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/purchasing/purchases/${purchase.body.id}/order`)
        .set(auth(session.accessToken))
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/purchasing/purchases/${purchase.body.id}/receive`)
        .set(auth(session.accessToken))
        .send({
          items: [
            { purchaseItemId: purchase.body.items[0].id, quantityReceived: 4 },
          ],
        })
        .expect(201);

      const balance = await getBalance(session);
      expect(balance.quantityInTransit).toBe('6');
      expect(balance.quantityAvailable).toBe('14');
    });

    it('cancelar compra em pedido zera o em trânsito', async () => {
      const { session, variantId } = await setup();

      const purchase = await request(app.getHttpServer())
        .post('/api/v1/purchasing/purchases')
        .set(auth(session.accessToken))
        .send({
          items: [
            { productVariantId: variantId, quantity: 5, unitCostOriginCurrency: 50 },
          ],
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/purchasing/purchases/${purchase.body.id}/order`)
        .set(auth(session.accessToken))
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/purchasing/purchases/${purchase.body.id}/cancel`)
        .set(auth(session.accessToken))
        .expect(201);

      const balance = await getBalance(session);
      expect(balance.quantityInTransit).toBe('0');
      expect(balance.quantityAvailable).toBe('10');
    });
  });
});

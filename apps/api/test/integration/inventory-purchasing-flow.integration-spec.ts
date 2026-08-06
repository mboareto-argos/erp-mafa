/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';

describe('Inventory + Purchasing — fluxo completo (integração)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createOwnerSessionWithProduct() {
    const session = await registerCompany(app);
    const product = await createProduct(app, session.accessToken, {
      minStock: 4,
    });
    return { session, product, variantId: product.variants[0].id as string };
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('rascunho e pedido não alteram o estoque (RN 10.6.1/10.6.2)', async () => {
    const { session, variantId } = await createOwnerSessionWithProduct();

    const purchase = await request(app.getHttpServer())
      .post('/api/v1/purchasing/purchases')
      .set(auth(session.accessToken))
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 10,
            unitCostOriginCurrency: 100,
          },
        ],
      })
      .expect(201);
    expect(purchase.body.status).toBe('draft');

    await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchase.body.id}/order`)
      .set(auth(session.accessToken))
      .expect(201)
      .expect((res) => expect(res.body.status).toBe('ordered'));

    const balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    expect(balances.body).toHaveLength(0);
  });

  it('edita somente o rascunho e preserva os itens anteriores por inativação', async () => {
    const { session, variantId } = await createOwnerSessionWithProduct();

    const purchase = await request(app.getHttpServer())
      .post('/api/v1/purchasing/purchases')
      .set(auth(session.accessToken))
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 2,
            unitCostOriginCurrency: 10,
          },
        ],
      })
      .expect(201);
    const previousItemId = purchase.body.items[0].id;

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/purchasing/purchases/${purchase.body.id}`)
      .set(auth(session.accessToken))
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 4,
            unitCostOriginCurrency: 12.5,
          },
        ],
      })
      .expect(200);
    expect(updated.body.items).toHaveLength(1);
    expect(updated.body.items[0]).toMatchObject({
      quantity: '4',
      unitCostOriginCurrency: '12.5',
    });
    expect(updated.body.items[0].id).not.toBe(previousItemId);

    await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchase.body.id}/order`)
      .set(auth(session.accessToken))
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/purchasing/purchases/${purchase.body.id}`)
      .set(auth(session.accessToken))
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 5,
            unitCostOriginCurrency: 13,
          },
        ],
      })
      .expect(409);
  });

  it('recebimento parcial e total: saldo, status da compra e custo médio móvel (RN 11.4)', async () => {
    const { session, variantId } = await createOwnerSessionWithProduct();

    const purchase = await request(app.getHttpServer())
      .post('/api/v1/purchasing/purchases')
      .set(auth(session.accessToken))
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 10,
            unitCostOriginCurrency: 100,
          },
        ],
      })
      .expect(201);
    const purchaseId = purchase.body.id;
    const itemId = purchase.body.items[0].id;

    await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchaseId}/order`)
      .set(auth(session.accessToken))
      .expect(201);

    // Recebe 5 de 10 — sem estoque anterior, custo médio = custo recebido.
    const partial = await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchaseId}/receive`)
      .set(auth(session.accessToken))
      .send({ items: [{ purchaseItemId: itemId, quantityReceived: 5 }] })
      .expect(201);
    expect(partial.body.status).toBe('partially_received');

    let balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    expect(balances.body[0].quantityAvailable).toBe('5');

    let products = await request(app.getHttpServer())
      .get('/api/v1/catalog/products')
      .set(auth(session.accessToken))
      .expect(200);
    expect(products.body[0].prices[0].costPrice).toBe('100');

    // Recebe os 5 restantes, com R$100 de frete só neste recebimento —
    // unitCostFinal = 100 + 100/5 = 120; média = (5*100 + 5*120)/10 = 110
    // (mesmo exemplo do §10.6 do Documento de Negócio).
    const final = await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchaseId}/receive`)
      .set(auth(session.accessToken))
      .send({
        items: [{ purchaseItemId: itemId, quantityReceived: 5 }],
        additionalCosts: [{ type: 'freight', amount: 100 }],
      })
      .expect(201);
    expect(final.body.status).toBe('received');

    balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    expect(balances.body[0].quantityAvailable).toBe('10');

    products = await request(app.getHttpServer())
      .get('/api/v1/catalog/products')
      .set(auth(session.accessToken))
      .expect(200);
    expect(products.body[0].prices[0].costPrice).toBe('110');

    const movements = await request(app.getHttpServer())
      .get(`/api/v1/inventory/movements?productVariantId=${variantId}`)
      .set(auth(session.accessToken))
      .expect(200);
    expect(movements.body).toHaveLength(2);
    expect(movements.body.every((m: { type: string }) => m.type === 'in')).toBe(
      true,
    );
  });

  it('não permite receber mais do que foi comprado', async () => {
    const { session, variantId } = await createOwnerSessionWithProduct();

    const purchase = await request(app.getHttpServer())
      .post('/api/v1/purchasing/purchases')
      .set(auth(session.accessToken))
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 5,
            unitCostOriginCurrency: 10,
          },
        ],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchase.body.id}/order`)
      .set(auth(session.accessToken))
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchase.body.id}/receive`)
      .set(auth(session.accessToken))
      .send({
        items: [
          { purchaseItemId: purchase.body.items[0].id, quantityReceived: 6 },
        ],
      })
      .expect(400);
    expect(response.body.error.code).toBe('RECEIVED_QUANTITY_EXCEEDS_ORDERED');
  });

  it('não permite receber uma compra ainda em rascunho', async () => {
    const { session, variantId } = await createOwnerSessionWithProduct();

    const purchase = await request(app.getHttpServer())
      .post('/api/v1/purchasing/purchases')
      .set(auth(session.accessToken))
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 5,
            unitCostOriginCurrency: 10,
          },
        ],
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchase.body.id}/receive`)
      .set(auth(session.accessToken))
      .send({
        items: [
          { purchaseItemId: purchase.body.items[0].id, quantityReceived: 5 },
        ],
      })
      .expect(409);
    expect(response.body.error.code).toBe('INVALID_PURCHASE_STATUS');
  });

  it('ajuste manual nunca deixa o saldo disponível negativo (RN 10.7.6)', async () => {
    const { session, variantId } = await createOwnerSessionWithProduct();

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set(auth(session.accessToken))
      .send({
        productVariantId: variantId,
        quantity: 10,
        reason: 'Estoque inicial',
      })
      .expect(201);

    const blocked = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set(auth(session.accessToken))
      .send({
        productVariantId: variantId,
        quantity: -20,
        reason: 'Ajuste inválido',
      })
      .expect(400);
    expect(blocked.body.error.code).toBe('STOCK_INSUFFICIENT');

    const balances = await request(app.getHttpServer())
      .get('/api/v1/inventory/balances')
      .set(auth(session.accessToken))
      .expect(200);
    expect(balances.body[0].quantityAvailable).toBe('10');

    const movements = await request(app.getHttpServer())
      .get(`/api/v1/inventory/movements?productVariantId=${variantId}`)
      .set(auth(session.accessToken))
      .expect(200);
    expect(movements.body).toHaveLength(1);
    expect(movements.body[0].adjustment.reason).toBe('Estoque inicial');
    expect(movements.body[0].productVariant.product.name).toBeTruthy();
  });

  it('alerta de estoque baixo reflete o saldo disponível vs. minStock (RN 10.7.8)', async () => {
    // Produto criado com minStock=4 (createOwnerSessionWithProduct) — sem
    // nenhuma entrada de estoque ainda, disponível é 0, que já é <= 4.
    const { session, variantId, product } =
      await createOwnerSessionWithProduct();

    let lowStock = await request(app.getHttpServer())
      .get('/api/v1/inventory/low-stock')
      .set(auth(session.accessToken))
      .expect(200);
    expect(lowStock.body).toHaveLength(1);
    expect(lowStock.body[0].productId).toBe(product.id);

    // Sobe para 10 (> minStock=4) — sai do alerta.
    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set(auth(session.accessToken))
      .send({
        productVariantId: variantId,
        quantity: 10,
        reason: 'Estoque inicial',
      })
      .expect(201);

    lowStock = await request(app.getHttpServer())
      .get('/api/v1/inventory/low-stock')
      .set(auth(session.accessToken))
      .expect(200);
    expect(lowStock.body).toHaveLength(0);

    // Desce para 2 (<= minStock=4) — volta a aparecer.
    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set(auth(session.accessToken))
      .send({ productVariantId: variantId, quantity: -8, reason: 'Saída' })
      .expect(201);

    lowStock = await request(app.getHttpServer())
      .get('/api/v1/inventory/low-stock')
      .set(auth(session.accessToken))
      .expect(200);
    expect(lowStock.body).toHaveLength(1);
    expect(lowStock.body[0].quantityAvailable).toBe('2');
  });

  it('cancela compra em rascunho, mas nunca uma já recebida (RN 10.6.6)', async () => {
    const { session, variantId } = await createOwnerSessionWithProduct();

    const draft = await request(app.getHttpServer())
      .post('/api/v1/purchasing/purchases')
      .set(auth(session.accessToken))
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 1,
            unitCostOriginCurrency: 10,
          },
        ],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${draft.body.id}/cancel`)
      .set(auth(session.accessToken))
      .expect(201)
      .expect((res) => expect(res.body.status).toBe('cancelled'));

    const received = await request(app.getHttpServer())
      .post('/api/v1/purchasing/purchases')
      .set(auth(session.accessToken))
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 1,
            unitCostOriginCurrency: 10,
          },
        ],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${received.body.id}/order`)
      .set(auth(session.accessToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${received.body.id}/receive`)
      .set(auth(session.accessToken))
      .send({
        items: [
          { purchaseItemId: received.body.items[0].id, quantityReceived: 1 },
        ],
      })
      .expect(201);

    const cancelResponse = await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${received.body.id}/cancel`)
      .set(auth(session.accessToken))
      .expect(409);
    expect(cancelResponse.body.error.code).toBe('PURCHASE_ALREADY_RECEIVED');
  });
});

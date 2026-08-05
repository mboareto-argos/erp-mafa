/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';
import { createPaymentMethod } from './utils/sales-helpers';
import { PrismaService } from '../../src/prisma/prisma.service';

// TA-API-002: cobre os 3 endpoints que aceitam Idempotency-Key
// (inventory/adjustments já coberto em inventory-purchasing-tenant-isolation)
// e os dois branches de erro do IdempotencyService que ainda não tinham
// teste — chave inválida e conflito de operação em andamento.
describe('Idempotency-Key e auditoria — purchases.receive e sales.confirm', () => {
  let app: INestApplication;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reenviar receive com a mesma Idempotency-Key devolve a resposta original e grava só uma auditoria', async () => {
    const session = await registerCompany(app, {
      companyName: 'Idempotência Compras',
    });
    const product = await createProduct(app, session.accessToken);
    const variantId = product.variants[0].id;

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

    const receiveBody = {
      items: [
        {
          purchaseItemId: purchase.body.items[0].id,
          quantityReceived: 5,
        },
      ],
    };

    const firstReceive = await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchase.body.id}/receive`)
      .set(auth(session.accessToken))
      .set('Idempotency-Key', 'purchase-receive-replay')
      .send(receiveBody)
      .expect(201);

    const replayedReceive = await request(app.getHttpServer())
      .post(`/api/v1/purchasing/purchases/${purchase.body.id}/receive`)
      .set(auth(session.accessToken))
      .set('Idempotency-Key', 'purchase-receive-replay')
      .send(receiveBody)
      .expect(201);
    expect(replayedReceive.body).toEqual(firstReceive.body);

    const auditLogs = await app.get(PrismaService).auditLog.findMany({
      where: { companyId: session.company.id, action: 'purchase.received' },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      entityType: 'purchase',
      entityId: purchase.body.id,
    });
  });

  it('reenviar confirm com a mesma Idempotency-Key devolve a resposta original e grava só uma auditoria', async () => {
    const session = await registerCompany(app, {
      companyName: 'Idempotência Vendas',
    });
    const product = await createProduct(app, session.accessToken);
    const variantId = product.variants[0].id;
    const paymentMethod = await createPaymentMethod(app, session.accessToken);

    const purchase = await request(app.getHttpServer())
      .post('/api/v1/purchasing/purchases')
      .set(auth(session.accessToken))
      .send({
        items: [
          {
            productVariantId: variantId,
            quantity: 10,
            unitCostOriginCurrency: 50,
          },
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
          { purchaseItemId: purchase.body.items[0].id, quantityReceived: 10 },
        ],
      })
      .expect(201);

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 2, unitPrice: 100 }],
      })
      .expect(201);

    const confirmBody = {
      payments: [{ paymentMethodId: paymentMethod.id, amount: 200 }],
    };

    const firstConfirm = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .set('Idempotency-Key', 'sale-confirm-replay')
      .send(confirmBody)
      .expect(201);

    const replayedConfirm = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .set('Idempotency-Key', 'sale-confirm-replay')
      .send(confirmBody)
      .expect(201);
    expect(replayedConfirm.body).toEqual(firstConfirm.body);

    const auditLogs = await app.get(PrismaService).auditLog.findMany({
      where: { companyId: session.company.id, action: 'sale.confirmed' },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      entityType: 'sale',
      entityId: sale.body.id,
    });
  });

  it('rejeita Idempotency-Key maior que 255 caracteres com IDEMPOTENCY_KEY_INVALID', async () => {
    const session = await registerCompany(app, {
      companyName: 'Chave Inválida',
    });
    const product = await createProduct(app, session.accessToken);
    const variantId = product.variants[0].id;

    const response = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set(auth(session.accessToken))
      .set('Idempotency-Key', 'x'.repeat(256))
      .send({
        productVariantId: variantId,
        quantity: 5,
        reason: 'Chave inválida',
      })
      .expect(400);
    expect(response.body.error.code).toBe('IDEMPOTENCY_KEY_INVALID');
  });

  it('rejeita uma segunda chamada concorrente com a mesma chave enquanto a primeira ainda está em andamento (IDEMPOTENCY_IN_PROGRESS)', async () => {
    const session = await registerCompany(app, {
      companyName: 'Operação em Andamento',
    });
    const product = await createProduct(app, session.accessToken);
    const variantId = product.variants[0].id;

    // Simula o estado que uma segunda requisição concorrente encontraria: um
    // registro já criado para a mesma chave, ainda sem resposta gravada
    // (completedAt/response nulos) — exatamente o que IdempotencyService
    // grava antes de rodar a ação.
    await app.get(PrismaService).idempotencyRecord.create({
      data: {
        companyId: session.company.id,
        operation: `inventory.adjustments:${variantId}:5:Concorrência`,
        key: 'in-flight-key',
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjustments')
      .set(auth(session.accessToken))
      .set('Idempotency-Key', 'in-flight-key')
      .send({
        productVariantId: variantId,
        quantity: 5,
        reason: 'Concorrência',
      })
      .expect(409);
    expect(response.body.error.code).toBe('IDEMPOTENCY_IN_PROGRESS');
  });
});

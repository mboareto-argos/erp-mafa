/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- respostas HTTP de supertest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function createCustomer(
  app: INestApplication,
  accessToken: string,
  overrides: Partial<{ name: string }> = {},
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: overrides.name ?? 'Cliente de Teste' })
    .expect(201);
  return response.body;
}

export async function createPaymentMethod(
  app: INestApplication,
  accessToken: string,
  overrides: Partial<{
    type: string;
    name: string;
    feeRate: number;
    feeFixed: number;
  }> = {},
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/payments/methods')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      type: overrides.type ?? 'cash',
      name: overrides.name ?? 'Dinheiro',
      ...(overrides.feeRate !== undefined
        ? { feeRate: overrides.feeRate }
        : {}),
      ...(overrides.feeFixed !== undefined
        ? { feeFixed: overrides.feeFixed }
        : {}),
    })
    .expect(201);
  return response.body;
}

// Compõe compra -> pedido -> recebimento pra colocar estoque numa variante
// rapidamente nos testes de Sales (reaproveita o fluxo já testado de
// Purchasing).
export async function receiveStock(
  app: INestApplication,
  accessToken: string,
  productVariantId: string,
  quantity: number,
  unitCost: number,
) {
  const purchase = await request(app.getHttpServer())
    .post('/api/v1/purchasing/purchases')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      items: [{ productVariantId, quantity, unitCostOriginCurrency: unitCost }],
    })
    .expect(201);

  await request(app.getHttpServer())
    .post(`/api/v1/purchasing/purchases/${purchase.body.id}/order`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(201);

  await request(app.getHttpServer())
    .post(`/api/v1/purchasing/purchases/${purchase.body.id}/receive`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      items: [
        {
          purchaseItemId: purchase.body.items[0].id,
          quantityReceived: quantity,
        },
      ],
    })
    .expect(201);
}

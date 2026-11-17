/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- respostas HTTP do supertest não são tipadas neste nível */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';
import { createPaymentMethod, receiveStock } from './utils/sales-helpers';

// Paginação opcional das listas (Vendas, Compras, movimentações de estoque):
// sem `page` a resposta continua sendo o array completo; com `page`, vem uma
// página e os números do topo calculados sobre o histórico inteiro — sempre
// só da própria empresa.
describe('Paginação das listas (inclui isolamento multiempresa)', () => {
  let app: INestApplication;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  async function setup() {
    const session = await registerCompany(app);
    const token = session.accessToken;
    const product = await createProduct(app, token);
    const variantId = product.variants[0].id as string;
    await receiveStock(app, token, variantId, 50, 10);
    const account = await http()
      .post('/api/v1/financial-accounts')
      .set(auth(token))
      .send({ name: 'Caixa' })
      .expect(201);
    const method = await createPaymentMethod(app, token, {
      financialAccountId: account.body.id,
    });
    return { token, variantId, methodId: method.id as string };
  }

  async function sale(
    token: string,
    variantId: string,
    methodId: string | null,
    unitPrice: number,
  ) {
    const created = await http()
      .post('/api/v1/sales')
      .set(auth(token))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 1, unitPrice }],
      })
      .expect(201);
    if (methodId)
      await http()
        .post(`/api/v1/sales/${created.body.id}/confirm`)
        .set(auth(token))
        .send({ payments: [{ paymentMethodId: methodId, amount: unitPrice }] })
        .expect(201);
    return created.body.id as string;
  }

  it('vendas: página, total e números do topo do histórico inteiro; sem page continua array', async () => {
    const { token, variantId, methodId } = await setup();
    for (let index = 0; index < 3; index += 1)
      await sale(token, variantId, methodId, 100);
    await sale(token, variantId, null, 50); // rascunho

    const first = await http()
      .get('/api/v1/sales?page=1&pageSize=2')
      .set(auth(token))
      .expect(200);
    expect(first.body).toMatchObject({
      total: 4,
      page: 1,
      pageSize: 2,
      summary: { confirmedCount: 3, confirmedTotal: '300' },
    });
    expect(first.body.items).toHaveLength(2);
    const second = await http()
      .get('/api/v1/sales?page=2&pageSize=2')
      .set(auth(token))
      .expect(200);
    const ids = [...first.body.items, ...second.body.items].map(
      (item: any) => item.id,
    );
    expect(new Set(ids).size).toBe(4);

    const legacy = await http()
      .get('/api/v1/sales')
      .set(auth(token))
      .expect(200);
    expect(Array.isArray(legacy.body)).toBe(true);
    expect(legacy.body).toHaveLength(4);
  });

  it('compras: página e números do topo; pageSize acima de 100 é limitado', async () => {
    const { token } = await setup();
    const page = await http()
      .get('/api/v1/purchasing/purchases?page=1&pageSize=500')
      .set(auth(token))
      .expect(200);
    expect(page.body).toMatchObject({
      total: 1,
      pageSize: 100,
      summary: { receivedCount: 1, receivedItems: 1 },
    });
  });

  it('movimentações: só das variações pedidas e as N mais recentes', async () => {
    const { token, variantId, methodId } = await setup();
    const other = await createProduct(app, token);
    const otherId = other.variants[0].id as string;
    await receiveStock(app, token, otherId, 5, 10);
    await sale(token, variantId, methodId, 100);

    const filtered = await http()
      .get(`/api/v1/inventory/movements?productVariantIds=${otherId}`)
      .set(auth(token))
      .expect(200);
    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].productVariantId).toBe(otherId);

    const latest = await http()
      .get('/api/v1/inventory/movements?take=1')
      .set(auth(token))
      .expect(200);
    expect(latest.body).toHaveLength(1);
    expect(latest.body[0].originType).toBe('sale');
  });

  it('multiempresa: a página e os totais nunca incluem outra empresa', async () => {
    const { token, variantId, methodId } = await setup();
    await sale(token, variantId, methodId, 100);
    const other = (await registerCompany(app)).accessToken;

    const sales = await http()
      .get('/api/v1/sales?page=1')
      .set(auth(other))
      .expect(200);
    expect(sales.body).toMatchObject({
      total: 0,
      items: [],
      summary: { confirmedCount: 0, confirmedTotal: '0' },
    });
    const purchases = await http()
      .get('/api/v1/purchasing/purchases?page=1')
      .set(auth(other))
      .expect(200);
    expect(purchases.body).toMatchObject({
      total: 0,
      summary: { receivedCount: 0, receivedItems: 0 },
    });
    const movements = await http()
      .get(`/api/v1/inventory/movements?productVariantIds=${variantId}`)
      .set(auth(other))
      .expect(200);
    expect(movements.body).toHaveLength(0);

    // Controle positivo: a dona vê a própria venda.
    const own = await http()
      .get('/api/v1/sales?page=1')
      .set(auth(token))
      .expect(200);
    expect(own.body.total).toBe(1);
  });
});

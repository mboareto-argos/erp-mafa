/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- respostas HTTP do supertest não são tipadas neste nível */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';
import { createPaymentMethod, receiveStock } from './utils/sales-helpers';
import { switchRole } from './utils/role-helpers';

// BR §10.3 regras 11–13 (kits "na hora" e "montados antes") e §10.10 regra
// 19 (brinde). Exemplo numérico usado em todos os casos:
//   Peça A: custo R$ 50, 10 em estoque — 1 por kit
//   Peça B: custo R$ 20, 10 em estoque — 2 por kit
//   Custo do kit = 50 + 2 x 20 = R$ 90; dá para montar min(10/1, 10/2) = 5.
describe('Kits e brindes (inclui isolamento multiempresa)', () => {
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
    const a = await createProduct(app, token, { name: 'Perfume A' });
    const b = await createProduct(app, token, { name: 'Body splash B' });
    const aId = a.variants[0].id as string;
    const bId = b.variants[0].id as string;
    await receiveStock(app, token, aId, 10, 50);
    await receiveStock(app, token, bId, 10, 20);
    const kit = await createKitProduct(token, 'Kit presente');
    const account = await http()
      .post('/api/v1/financial-accounts')
      .set(auth(token))
      .send({ name: 'Caixa' })
      .expect(201);
    const paymentMethod = await createPaymentMethod(app, token, {
      financialAccountId: account.body.id,
    });
    return { session, token, aId, bId, kit, paymentMethod };
  }

  async function createKitProduct(token: string, name: string) {
    const response = await http()
      .post('/api/v1/catalog/products')
      .set(auth(token))
      .send({
        sku: `KIT-${Date.now()}-${Math.random()}`,
        name,
        unit: 'un',
        salePrice: 120,
      })
      .expect(201);
    return {
      id: response.body.id as string,
      variantId: response.body.variants[0].id as string,
    };
  }

  const setKit = (
    token: string,
    productId: string,
    body: Record<string, unknown>,
  ) => http().put(`/api/v1/kits/${productId}`).set(auth(token)).send(body);

  async function stock(token: string) {
    const response = await http()
      .get('/api/v1/inventory/balances')
      .set(auth(token))
      .expect(200);
    return Object.fromEntries(
      response.body.map((balance: any) => [
        balance.productVariantId,
        balance.quantityAvailable,
      ]),
    ) as Record<string, string>;
  }

  async function sell(
    token: string,
    paymentMethodId: string,
    items: Record<string, unknown>[],
  ) {
    const sale = await http()
      .post('/api/v1/sales')
      .set(auth(token))
      .send({ channel: 'presencial', items })
      .expect(201);
    const confirmed = await http()
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(token))
      .send({
        payments: [{ paymentMethodId, amount: Number(sale.body.total) }],
      })
      .expect(201);
    return confirmed.body;
  }

  it('kit "na hora": vender baixa as peças com custo = soma das peças; devolver e cancelar devolvem as peças', async () => {
    const { token, aId, bId, kit, paymentMethod } = await setup();
    const saved = await setKit(token, kit.id, {
      mode: 'on_demand',
      components: [
        { productVariantId: aId, quantity: 1 },
        { productVariantId: bId, quantity: 2 },
      ],
    }).expect(200);
    expect(saved.body).toMatchObject({
      mode: 'on_demand',
      piecesCost: '90',
      canAssemble: 5,
      kitSalePrice: '120',
    });

    const sale = await sell(token, paymentMethod.id, [
      { productVariantId: kit.variantId, quantity: 2, unitPrice: 120 },
    ]);
    expect(sale.items[0].unitCostAtSale).toBe('90');
    expect(sale.cmvCalculated).toBe('180');
    expect(sale.grossProfitCalculated).toBe('60');
    let balances = await stock(token);
    expect(balances[aId]).toBe('8');
    expect(balances[bId]).toBe('6');
    expect(balances[kit.variantId]).toBeUndefined();

    // Composição muda depois da venda: devolução usa a composição congelada.
    await setKit(token, kit.id, {
      mode: 'on_demand',
      components: [{ productVariantId: aId, quantity: 3 }],
    }).expect(200);

    await http()
      .post(`/api/v1/sales/${sale.id}/return`)
      .set(auth(token))
      .send({
        reason: 'Cliente desistiu de um kit',
        items: [
          { saleItemId: sale.items[0].id, quantity: 1, condition: 'apt' },
        ],
      })
      .expect(201);
    balances = await stock(token);
    expect(balances[aId]).toBe('9');
    expect(balances[bId]).toBe('8');

    // Nova venda com a composição nova (3 x A); cancelar devolve as 3.
    const second = await sell(token, paymentMethod.id, [
      { productVariantId: kit.variantId, quantity: 1, unitPrice: 120 },
    ]);
    expect(second.cmvCalculated).toBe('150');
    balances = await stock(token);
    expect(balances[aId]).toBe('6');
    await http()
      .post(`/api/v1/sales/${second.id}/cancel`)
      .set(auth(token))
      .expect(201);
    balances = await stock(token);
    expect(balances[aId]).toBe('9');
    expect(balances[bId]).toBe('8');
  });

  it('kit "na hora" reservado: reserva as peças e a confirmação consome a reserva', async () => {
    const { session, token, aId, bId, kit, paymentMethod } = await setup();
    await setKit(token, kit.id, {
      mode: 'on_demand',
      components: [
        { productVariantId: aId, quantity: 1 },
        { productVariantId: bId, quantity: 2 },
      ],
    }).expect(200);
    const customer = await http()
      .post('/api/v1/customers')
      .set(auth(token))
      .send({ name: 'Maria' })
      .expect(201);
    const sale = await http()
      .post('/api/v1/sales')
      .set(auth(token))
      .send({
        channel: 'whatsapp',
        customerId: customer.body.id,
        items: [
          { productVariantId: kit.variantId, quantity: 1, unitPrice: 120 },
        ],
      })
      .expect(201);
    await http()
      .post(`/api/v1/sales/${sale.body.id}/reserve`)
      .set(auth(token))
      .expect(201);
    let balances = await stock(token);
    expect(balances[aId]).toBe('9');
    expect(balances[bId]).toBe('8');

    const confirmed = await http()
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(token))
      .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 120 }] })
      .expect(201);
    expect(confirmed.body.cmvCalculated).toBe('90');
    balances = await stock(token);
    expect(balances[aId]).toBe('9');
    expect(balances[bId]).toBe('8');
    void session;
  });

  it('kit "montado antes": montar baixa as peças e soma kits com custo das peças; vender baixa o kit; desmontar devolve as peças', async () => {
    const { token, aId, bId, kit, paymentMethod } = await setup();
    await setKit(token, kit.id, {
      mode: 'assembled',
      components: [
        { productVariantId: aId, quantity: 1 },
        { productVariantId: bId, quantity: 2 },
      ],
    }).expect(200);

    const assembled = await http()
      .post(`/api/v1/kits/${kit.id}/assemble`)
      .set(auth(token))
      .send({ quantity: 3 })
      .expect(201);
    expect(assembled.body).toMatchObject({ quantity: '3', unitCost: '90' });
    let balances = await stock(token);
    expect(balances[aId]).toBe('7');
    expect(balances[bId]).toBe('4');
    expect(balances[kit.variantId]).toBe('3');

    const detail = await http()
      .get(`/api/v1/kits/${kit.id}`)
      .set(auth(token))
      .expect(200);
    expect(detail.body).toMatchObject({ kitStock: '3', kitUnitCost: '90' });

    const sale = await sell(token, paymentMethod.id, [
      { productVariantId: kit.variantId, quantity: 1, unitPrice: 120 },
    ]);
    expect(sale.cmvCalculated).toBe('90');
    balances = await stock(token);
    expect(balances[kit.variantId]).toBe('2');
    expect(balances[aId]).toBe('7');

    // Kit pronto em estoque não muda de modo.
    await setKit(token, kit.id, {
      mode: 'on_demand',
      components: [{ productVariantId: aId, quantity: 1 }],
    })
      .expect(409)
      .expect((res) => expect(res.body.error.code).toBe('KIT_HAS_STOCK'));

    await http()
      .post(`/api/v1/kits/${kit.id}/disassemble`)
      .set(auth(token))
      .send({ quantity: 3 })
      .expect(400)
      .expect((res) => expect(res.body.error.code).toBe('STOCK_INSUFFICIENT'));
    await http()
      .post(`/api/v1/kits/${kit.id}/disassemble`)
      .set(auth(token))
      .send({ quantity: 2 })
      .expect(201);
    balances = await stock(token);
    expect(balances[kit.variantId]).toBe('0');
    expect(balances[aId]).toBe('9');
    expect(balances[bId]).toBe('8');

    // Rastreável: movimentações de origem kit_assembly (regra 13).
    const movements = await http()
      .get(`/api/v1/inventory/movements?productVariantId=${bId}`)
      .set(auth(token))
      .expect(200);
    const kitMoves = movements.body
      .filter((movement: any) => movement.originType === 'kit_assembly')
      .map((movement: any) => movement.quantity)
      .sort();
    expect(kitMoves).toEqual(['-6', '4']);
  });

  it('montar sem peças suficientes é recusado e não baixa nada', async () => {
    const { token, aId, bId, kit } = await setup();
    await setKit(token, kit.id, {
      mode: 'assembled',
      components: [
        { productVariantId: aId, quantity: 1 },
        { productVariantId: bId, quantity: 2 },
      ],
    }).expect(200);
    await http()
      .post(`/api/v1/kits/${kit.id}/assemble`)
      .set(auth(token))
      .send({ quantity: 6 })
      .expect(400)
      .expect((res) => expect(res.body.error.code).toBe('STOCK_INSUFFICIENT'));
    const balances = await stock(token);
    expect(balances[aId]).toBe('10');
    expect(balances[bId]).toBe('10');
  });

  it('composição inválida: kit dentro de kit, o próprio kit como peça, montar kit "na hora"', async () => {
    const { token, aId, kit } = await setup();
    await setKit(token, kit.id, {
      mode: 'on_demand',
      components: [{ productVariantId: aId, quantity: 1 }],
    }).expect(200);
    const other = await createKitProduct(token, 'Kit duplo');
    await setKit(token, other.id, {
      mode: 'on_demand',
      components: [{ productVariantId: kit.variantId, quantity: 1 }],
    })
      .expect(400)
      .expect((res) =>
        expect(res.body.error.code).toBe('INVALID_KIT_COMPONENT'),
      );
    await setKit(token, other.id, {
      mode: 'on_demand',
      components: [{ productVariantId: other.variantId, quantity: 1 }],
    })
      .expect(400)
      .expect((res) =>
        expect(res.body.error.code).toBe('INVALID_KIT_COMPONENT'),
      );
    await setKit(token, other.id, { mode: 'on_demand', components: [] }).expect(
      400,
    );
    await http()
      .post(`/api/v1/kits/${kit.id}/assemble`)
      .set(auth(token))
      .send({ quantity: 1 })
      .expect(409)
      .expect((res) =>
        expect(res.body.error.code).toBe('KIT_NOT_ASSEMBLED_MODE'),
      );
  });

  it('brinde: preço zero mesmo se o cliente mandar preço, sai do estoque e o custo entra no CMV e no gasto com brindes', async () => {
    const { token, aId, bId, paymentMethod } = await setup();
    const sale = await sell(token, paymentMethod.id, [
      { productVariantId: aId, quantity: 1, unitPrice: 100 },
      {
        productVariantId: bId,
        quantity: 1,
        unitPrice: 35,
        discount: 5,
        isGift: true,
      },
    ]);
    const gift = sale.items.find((item: any) => item.isGift);
    expect(gift).toMatchObject({ unitPrice: '0', discount: '0' });
    expect(sale.total).toBe('100');
    expect(sale.cmvCalculated).toBe('70');
    expect(sale.grossProfitCalculated).toBe('30');
    const balances = await stock(token);
    expect(balances[bId]).toBe('9');

    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const to = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
    )
      .toISOString()
      .slice(0, 10);
    const dashboard = await http()
      .get(`/api/v1/reporting/dashboard?from=${from}&to=${to}`)
      .set(auth(token))
      .expect(200);
    expect(dashboard.body).toMatchObject({ giftCost: '20', giftCount: '1' });
  });

  it('multiempresa: outra empresa não vê, não altera, não monta o kit e não usa peças de outra empresa', async () => {
    const { token, aId, kit } = await setup();
    await setKit(token, kit.id, {
      mode: 'assembled',
      components: [{ productVariantId: aId, quantity: 1 }],
    }).expect(200);

    const intruder = await registerCompany(app);
    const other = intruder.accessToken;
    await http().get(`/api/v1/kits/${kit.id}`).set(auth(other)).expect(404);
    await setKit(other, kit.id, {
      mode: 'assembled',
      components: [{ productVariantId: aId, quantity: 1 }],
    }).expect(404);
    await http()
      .post(`/api/v1/kits/${kit.id}/assemble`)
      .set(auth(other))
      .send({ quantity: 1 })
      .expect(404);

    // Kit da própria empresa com peça da empresa A: recusado.
    const ownKit = await createKitProduct(other, 'Kit intruso');
    await setKit(other, ownKit.id, {
      mode: 'on_demand',
      components: [{ productVariantId: aId, quantity: 1 }],
    })
      .expect(400)
      .expect((res) =>
        expect(res.body.error.code).toBe('INVALID_KIT_COMPONENT'),
      );

    // Controle positivo: a dona do kit continua montando.
    await http()
      .post(`/api/v1/kits/${kit.id}/assemble`)
      .set(auth(token))
      .send({ quantity: 1 })
      .expect(201);
  });

  it('permissão: vendedor vê o kit, mas não altera composição nem monta (backend)', async () => {
    const { session, aId, kit } = await setup();
    const seller = await switchRole(app, session, 'sales');
    await http().get(`/api/v1/kits/${kit.id}`).set(auth(seller)).expect(200);
    await setKit(seller, kit.id, {
      mode: 'assembled',
      components: [{ productVariantId: aId, quantity: 1 }],
    }).expect(403);
    await http()
      .post(`/api/v1/kits/${kit.id}/assemble`)
      .set(auth(seller))
      .send({ quantity: 1 })
      .expect(403);
  });
});

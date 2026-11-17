/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- respostas HTTP do supertest não são tipadas neste nível */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';
import {
  createCustomer,
  createPaymentMethod,
  receiveStock,
} from './utils/sales-helpers';
import { switchRole } from './utils/role-helpers';

// BR §10.12 regra 8 (chave Pix para o QR Code da venda) e §10.10 regra 26
// (recibo por link secreto, sem login, só com os dados do recibo).
describe('Chave Pix e recibo da venda (inclui isolamento multiempresa)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await app.close();
  });

  async function setup() {
    const session = await registerCompany(app);
    const token = session.accessToken;
    const product = await createProduct(app, token, { name: 'Yara EDP' });
    const variantId = product.variants[0].id as string;
    await receiveStock(app, token, variantId, 10, 50);
    const account = await http()
      .post('/api/v1/financial-accounts')
      .set(auth(token))
      .send({ name: 'Conta PJ' })
      .expect(201);
    const pix = await createPaymentMethod(app, token, {
      type: 'pix',
      name: 'Pix',
      financialAccountId: account.body.id,
    });
    return { session, token, variantId, pix };
  }

  async function confirmedSale(
    token: string,
    variantId: string,
    paymentMethodId: string,
    extra: Record<string, unknown> = {},
  ) {
    const sale = await http()
      .post('/api/v1/sales')
      .set(auth(token))
      .send({
        channel: 'presencial',
        items: [
          { productVariantId: variantId, quantity: 2, unitPrice: 150 },
          {
            productVariantId: variantId,
            quantity: 1,
            unitPrice: 0,
            isGift: true,
          },
        ],
        ...extra,
      })
      .expect(201);
    const confirmed = await http()
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(token))
      .send({ payments: [{ paymentMethodId, amount: 300 }] })
      .expect(201);
    return confirmed.body;
  }

  it('chave Pix: normaliza, recusa inválida, só em forma Pix e fica na auditoria (regra 8)', async () => {
    const { session, token, pix } = await setup();
    const saved = await http()
      .put(`/api/v1/payments/methods/${pix.id}/pix`)
      .set(auth(token))
      .send({
        keyType: 'cnpj',
        key: '11.222.333/0001-81',
        merchantName: 'MAFA Store',
        merchantCity: 'Sao Paulo',
      })
      .expect(200);
    expect(saved.body).toMatchObject({
      pixKey: '11222333000181',
      pixMerchantName: 'MAFA Store',
      pixMerchantCity: 'Sao Paulo',
    });

    await http()
      .put(`/api/v1/payments/methods/${pix.id}/pix`)
      .set(auth(token))
      .send({
        keyType: 'cpf',
        key: '123.456.789-00',
        merchantName: 'MAFA',
        merchantCity: 'SP',
      })
      .expect(400)
      .expect((res) => expect(res.body.error.code).toBe('INVALID_PIX_KEY'));

    const cash = await createPaymentMethod(app, token);
    await http()
      .put(`/api/v1/payments/methods/${cash.id}/pix`)
      .set(auth(token))
      .send({
        keyType: 'email',
        key: 'loja@exemplo.com',
        merchantName: 'MAFA',
        merchantCity: 'SP',
      })
      .expect(400)
      .expect((res) => expect(res.body.error.code).toBe('PIX_KEY_NOT_ALLOWED'));

    await http()
      .put(`/api/v1/payments/methods/${pix.id}/pix`)
      .set(auth(token))
      .send({ key: null })
      .expect(200)
      .expect((res) => expect(res.body.pixKey).toBeNull());

    const logs = await prisma.withTenant(session.company.id, () =>
      prisma.auditLog.count({
        where: {
          companyId: session.company.id,
          action: 'payment_method.pix_key_updated',
        },
      }),
    );
    expect(logs).toBe(2);
  });

  it('recibo: link criado na confirmação, abre sem login e nunca mostra custo ou lucro (regra 26)', async () => {
    const { token, variantId, pix } = await setup();
    const customer = await createCustomer(app, token, { name: 'Ana Souza' });
    const sale = await confirmedSale(token, variantId, pix.id, {
      customerId: customer.id,
    });
    expect(sale.receiptLinks).toHaveLength(1);
    const link = sale.receiptLinks[0].token as string;
    expect(link.length).toBeGreaterThanOrEqual(40);

    const receipt = await http()
      .get(`/api/v1/public/receipts/${link}`)
      .expect(200);
    expect(receipt.body).toMatchObject({
      store: { name: 'Empresa de Teste' },
      status: 'confirmed',
      customerName: 'Ana Souza',
      total: '300.00',
      payments: [{ method: 'Pix', amount: '300.00' }],
    });
    expect(receipt.body.items).toEqual([
      expect.objectContaining({
        name: 'Yara EDP',
        quantity: '2',
        total: '300.00',
        isGift: false,
      }),
      expect.objectContaining({ isGift: true, total: '0.00' }),
    ]);
    const raw = JSON.stringify(receipt.body);
    for (const internal of ['cmv', 'Cost', 'Profit', 'companyId', 'id"'])
      expect(raw).not.toContain(internal);

    await http()
      .get('/api/v1/public/receipts/nao-existe-123456789012')
      .expect(404);
    await http().get('/api/v1/public/receipts/a').expect(404);
  });

  it('recibo: fiado mostra as parcelas; cancelada aparece como cancelada', async () => {
    const { token, variantId, pix } = await setup();
    const customer = await createCustomer(app, token);
    const draft = await http()
      .post('/api/v1/sales')
      .set(auth(token))
      .send({
        channel: 'presencial',
        customerId: customer.id,
        items: [{ productVariantId: variantId, quantity: 1, unitPrice: 200 }],
      })
      .expect(201);
    const sale = await http()
      .post(`/api/v1/sales/${draft.body.id}/confirm`)
      .set(auth(token))
      .send({
        payments: [{ paymentMethodId: pix.id, amount: 50 }],
        installmentPlan: { count: 3, firstDueDate: '2026-12-10' },
      })
      .expect(201);
    const link = sale.body.receiptLinks[0].token;
    const receipt = await http()
      .get(`/api/v1/public/receipts/${link}`)
      .expect(200);
    expect(receipt.body.installments).toHaveLength(3);
    expect(receipt.body.installments[0]).toMatchObject({ number: 1 });

    await http()
      .post(`/api/v1/sales/${draft.body.id}/cancel`)
      .set(auth(token))
      .expect(201);
    const cancelled = await http()
      .get(`/api/v1/public/receipts/${link}`)
      .expect(200);
    expect(cancelled.body.status).toBe('cancelled');
  });

  it('gerar link novo invalida o anterior; rascunho não tem recibo', async () => {
    const { token, variantId, pix } = await setup();
    const sale = await confirmedSale(token, variantId, pix.id);
    const old = sale.receiptLinks[0].token;

    const same = await http()
      .post(`/api/v1/sales/${sale.id}/receipt-link`)
      .set(auth(token))
      .send({})
      .expect(201);
    expect(same.body.token).toBe(old);

    const rotated = await http()
      .post(`/api/v1/sales/${sale.id}/receipt-link`)
      .set(auth(token))
      .send({ rotate: true })
      .expect(201);
    expect(rotated.body.token).not.toBe(old);
    await http().get(`/api/v1/public/receipts/${old}`).expect(404);
    await http()
      .get(`/api/v1/public/receipts/${rotated.body.token}`)
      .expect(200);

    const draft = await http()
      .post('/api/v1/sales')
      .set(auth(token))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 1, unitPrice: 10 }],
      })
      .expect(201);
    await http()
      .post(`/api/v1/sales/${draft.body.id}/receipt-link`)
      .set(auth(token))
      .send({})
      .expect(409)
      .expect((res) =>
        expect(res.body.error.code).toBe('RECEIPT_NOT_AVAILABLE'),
      );
  });

  it('multiempresa e permissão: outra empresa não gera link nem altera a chave; vendedor não mexe na chave', async () => {
    const { session, token, variantId, pix } = await setup();
    const sale = await confirmedSale(token, variantId, pix.id);

    const other = (await registerCompany(app)).accessToken;
    await http()
      .post(`/api/v1/sales/${sale.id}/receipt-link`)
      .set(auth(other))
      .send({ rotate: true })
      .expect(404);
    await http()
      .put(`/api/v1/payments/methods/${pix.id}/pix`)
      .set(auth(other))
      .send({
        keyType: 'email',
        key: 'invasor@exemplo.com',
        merchantName: 'X',
        merchantCity: 'Y',
      })
      .expect(404);

    // O link da dona continua valendo (outra empresa não conseguiu girar).
    await http()
      .get(`/api/v1/public/receipts/${sale.receiptLinks[0].token}`)
      .expect(200);

    const seller = await switchRole(app, session, 'sales');
    await http()
      .put(`/api/v1/payments/methods/${pix.id}/pix`)
      .set(auth(seller))
      .send({
        keyType: 'email',
        key: 'loja@exemplo.com',
        merchantName: 'MAFA',
        merchantCity: 'SP',
      })
      .expect(403);
  });
});

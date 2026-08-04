/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
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
import {
  createFinancialAccount,
  getAccountBalance,
} from './utils/finance-helpers';

describe('Financeiro — fluxo completo (integração)', () => {
  let app: INestApplication;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('despesa paga na hora gera uma FinancialTransaction de saída', async () => {
    const session = await registerCompany(app);
    const account = await createFinancialAccount(app, session.accessToken);

    const expense = await request(app.getHttpServer())
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
    expect(expense.body.status).toBe('paid');

    const balance = await getAccountBalance(
      app,
      session.accessToken,
      account.id,
    );
    expect(balance).toBe('-50');
  });

  it('despesa futura gera um Payable vinculado, e pagá-lo zera o saldo em aberto', async () => {
    const session = await registerCompany(app);
    const account = await createFinancialAccount(app, session.accessToken);

    const expense = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set(auth(session.accessToken))
      .send({
        description: 'Aluguel',
        category: 'aluguel',
        amount: 300,
        competenceDate: '2026-08-04',
        paidNow: false,
        dueDate: '2026-09-01',
      })
      .expect(201);
    expect(expense.body.status).toBe('pending');
    const payableId = expense.body.payableId;
    expect(payableId).toEqual(expect.any(String));

    const payable = await request(app.getHttpServer())
      .post(`/api/v1/payables/${payableId}/pay`)
      .set(auth(session.accessToken))
      .send({ financialAccountId: account.id, amount: 300 })
      .expect(201);
    expect(payable.body.status).toBe('paid');
    expect(payable.body.amountPaid).toBe('300');

    const balance = await getAccountBalance(
      app,
      session.accessToken,
      account.id,
    );
    expect(balance).toBe('-300');

    // Não pode pagar de novo — já quitado.
    await request(app.getHttpServer())
      .post(`/api/v1/payables/${payableId}/pay`)
      .set(auth(session.accessToken))
      .send({ financialAccountId: account.id, amount: 1 })
      .expect(409);
  });

  it('receivable pago parcialmente não pode receber além do saldo em aberto', async () => {
    const session = await registerCompany(app);
    const account = await createFinancialAccount(app, session.accessToken);
    const customer = await createCustomer(app, session.accessToken);

    const receivable = await request(app.getHttpServer())
      .post('/api/v1/receivables')
      .set(auth(session.accessToken))
      .send({
        customerId: customer.id,
        description: 'Venda fiado',
        amountOriginal: 500,
        dueDate: '2026-09-01',
      })
      .expect(201);

    const paid = await request(app.getHttpServer())
      .post(`/api/v1/receivables/${receivable.body.id}/pay`)
      .set(auth(session.accessToken))
      .send({ financialAccountId: account.id, amount: 200 })
      .expect(201);
    expect(paid.body.status).toBe('partially_received');

    const overpay = await request(app.getHttpServer())
      .post(`/api/v1/receivables/${receivable.body.id}/pay`)
      .set(auth(session.accessToken))
      .send({ financialAccountId: account.id, amount: 400 })
      .expect(400);
    expect(overpay.body.error.code).toBe('RECEIVABLE_AMOUNT_EXCEEDS_BALANCE');

    const exact = await request(app.getHttpServer())
      .post(`/api/v1/receivables/${receivable.body.id}/pay`)
      .set(auth(session.accessToken))
      .send({ financialAccountId: account.id, amount: 300 })
      .expect(201);
    expect(exact.body.status).toBe('received');

    const balance = await getAccountBalance(
      app,
      session.accessToken,
      account.id,
    );
    expect(balance).toBe('500');
  });

  it('cancelar uma conta a receber exige motivo', async () => {
    const session = await registerCompany(app);
    const customer = await createCustomer(app, session.accessToken);
    const receivable = await request(app.getHttpServer())
      .post('/api/v1/receivables')
      .set(auth(session.accessToken))
      .send({
        customerId: customer.id,
        description: 'Teste',
        amountOriginal: 100,
        dueDate: '2026-09-01',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/receivables/${receivable.body.id}/cancel`)
      .set(auth(session.accessToken))
      .send({})
      .expect(400);

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/receivables/${receivable.body.id}/cancel`)
      .set(auth(session.accessToken))
      .send({ reason: 'Cliente desistiu da compra' })
      .expect(201);
    expect(cancelled.body.status).toBe('cancelled');
    expect(cancelled.body.cancelReason).toBe('Cliente desistiu da compra');
  });

  it('transferência entre contas gera duas transações e nunca conta como receita/despesa', async () => {
    const session = await registerCompany(app);
    const accountA = await createFinancialAccount(app, session.accessToken, {
      name: 'Caixa',
    });
    const accountB = await createFinancialAccount(app, session.accessToken, {
      name: 'Banco',
    });

    await request(app.getHttpServer())
      .post('/api/v1/cash-flow/transfers')
      .set(auth(session.accessToken))
      .send({
        fromAccountId: accountA.id,
        toAccountId: accountB.id,
        amount: 100,
        reason: 'Depósito',
      })
      .expect(201);

    expect(await getAccountBalance(app, session.accessToken, accountA.id)).toBe(
      '-100',
    );
    expect(await getAccountBalance(app, session.accessToken, accountB.id)).toBe(
      '100',
    );

    const transactions = await request(app.getHttpServer())
      .get('/api/v1/cash-flow/transactions')
      .set(auth(session.accessToken))
      .expect(200);
    expect(transactions.body).toHaveLength(2);
    expect(
      transactions.body.every(
        (t: { originType: string }) => t.originType === 'transfer',
      ),
    ).toBe(true);
  });

  it('venda à vista confirmada com forma de pagamento vinculada a uma conta gera entrada automática', async () => {
    const session = await registerCompany(app);
    const account = await createFinancialAccount(app, session.accessToken);
    const paymentMethod = await createPaymentMethod(app, session.accessToken, {
      financialAccountId: account.id,
    });
    const product = await createProduct(app, session.accessToken);
    const variantId = product.variants[0].id;
    await receiveStock(app, session.accessToken, variantId, 5, 50);

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 2, unitPrice: 100 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 200 }] })
      .expect(201);

    const balance = await getAccountBalance(
      app,
      session.accessToken,
      account.id,
    );
    expect(balance).toBe('200');
  });

  it('venda confirmada com forma de pagamento SEM conta vinculada não gera transação (retrocompatível)', async () => {
    const session = await registerCompany(app);
    const paymentMethod = await createPaymentMethod(app, session.accessToken);
    const product = await createProduct(app, session.accessToken);
    const variantId = product.variants[0].id;
    await receiveStock(app, session.accessToken, variantId, 5, 50);

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set(auth(session.accessToken))
      .send({
        channel: 'presencial',
        items: [{ productVariantId: variantId, quantity: 1, unitPrice: 100 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(session.accessToken))
      .send({ payments: [{ paymentMethodId: paymentMethod.id, amount: 100 }] })
      .expect(201);

    const transactions = await request(app.getHttpServer())
      .get('/api/v1/cash-flow/transactions')
      .set(auth(session.accessToken))
      .expect(200);
    expect(transactions.body).toHaveLength(0);
  });
});

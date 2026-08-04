/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import {
  createFinancialAccount,
  getAccountBalance,
} from './utils/finance-helpers';

// TA-TENANT-004: contas, transações e receivables/payables de uma empresa
// nunca vazam para outra.
describe('Isolamento multiempresa — Financeiro', () => {
  let app: INestApplication;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('empresa B nunca vê as contas financeiras nem as transações da empresa A', async () => {
    const companyA = await registerCompany(app, {
      companyName: 'Financeiro A',
    });
    const companyB = await registerCompany(app, {
      companyName: 'Financeiro B',
    });

    const accountA = await createFinancialAccount(app, companyA.accessToken);
    await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set(auth(companyA.accessToken))
      .send({
        description: 'Despesa A',
        category: 'outra',
        amount: 100,
        competenceDate: '2026-08-04',
        paidNow: true,
        financialAccountId: accountA.id,
      })
      .expect(201);

    const accountsAsB = await request(app.getHttpServer())
      .get('/api/v1/financial-accounts')
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(accountsAsB.body).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/api/v1/financial-accounts/${accountA.id}/balance`)
      .set(auth(companyB.accessToken))
      .expect(404);

    const transactionsAsB = await request(app.getHttpServer())
      .get('/api/v1/cash-flow/transactions')
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(transactionsAsB.body).toHaveLength(0);
  });

  it('empresa B não consegue pagar uma despesa/conta usando a conta financeira da empresa A', async () => {
    const companyA = await registerCompany(app, {
      companyName: 'Financeiro A2',
    });
    const companyB = await registerCompany(app, {
      companyName: 'Financeiro B2',
    });
    const accountA = await createFinancialAccount(app, companyA.accessToken);

    const response = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set(auth(companyB.accessToken))
      .send({
        description: 'Tentativa cross-tenant',
        category: 'outra',
        amount: 50,
        competenceDate: '2026-08-04',
        paidNow: true,
        financialAccountId: accountA.id,
      })
      .expect(400);
    expect(response.body.error.code).toBe('INVALID_FINANCIAL_ACCOUNT');

    // Saldo de A não foi afetado.
    expect(
      await getAccountBalance(app, companyA.accessToken, accountA.id),
    ).toBe('0');
  });

  it('empresa B nunca vê nem opera as receivables/payables da empresa A', async () => {
    const companyA = await registerCompany(app, {
      companyName: 'Financeiro A3',
    });
    const companyB = await registerCompany(app, {
      companyName: 'Financeiro B3',
    });

    const receivable = await request(app.getHttpServer())
      .post('/api/v1/receivables')
      .set(auth(companyA.accessToken))
      .send({
        description: 'Venda A',
        amountOriginal: 100,
        dueDate: '2026-09-01',
      })
      .expect(201);

    const listAsB = await request(app.getHttpServer())
      .get('/api/v1/receivables')
      .set(auth(companyB.accessToken))
      .expect(200);
    expect(listAsB.body).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/api/v1/receivables/${receivable.body.id}`)
      .set(auth(companyB.accessToken))
      .expect(404);
  });
});

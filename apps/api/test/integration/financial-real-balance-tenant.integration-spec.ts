/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP do supertest não são tipadas neste nível */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { switchRole } from './utils/role-helpers';

// BR §10.13 regras 8–11 (Fase 3 — financeiro real): saldo inicial,
// conferência com o banco, conta do proprietário (reembolso e aporte) e
// "dinheiro da loja" sem a conta do proprietário. Nenhuma dessas
// movimentações é receita ou despesa (não mexe na DRE).
describe('Financeiro real — saldo inicial, conferência e conta do proprietário', () => {
  let app: INestApplication;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const civil = (date: Date) => date.toISOString().slice(0, 10);
  const now = new Date();
  const from = civil(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
  );
  const to = civil(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0)),
  );

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  async function account(token: string, body: { name: string; kind?: string }) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/financial-accounts')
      .set(auth(token))
      .send(body)
      .expect(201);
    return response.body as { id: string; kind: string };
  }
  async function balances(token: string) {
    const response = await request(app.getHttpServer())
      .get('/api/v1/financial-accounts')
      .set(auth(token))
      .expect(200);
    return Object.fromEntries(
      (
        response.body as {
          id: string;
          balance: string;
          hasOpeningBalance: boolean;
        }[]
      ).map((item) => [item.id, item]),
    );
  }
  const dre = async (token: string) =>
    (
      await request(app.getHttpServer())
        .get(`/api/v1/reporting/dre?from=${from}&to=${to}`)
        .set(auth(token))
        .expect(200)
    ).body;
  const dashboard = async (token: string) =>
    (
      await request(app.getHttpServer())
        .get(`/api/v1/reporting/dashboard?from=${from}&to=${to}`)
        .set(auth(token))
        .expect(200)
    ).body;

  it('saldo inicial: uma única vez, pode ser negativo e não é receita (regra 8)', async () => {
    const session = await registerCompany(app);
    const pj = await account(session.accessToken, { name: 'Conta PJ' });
    const before = await dre(session.accessToken);

    await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${pj.id}/opening-balance`)
      .set(auth(session.accessToken))
      .send({ amount: 1500.5, date: from })
      .expect(201);
    const listed = await balances(session.accessToken);
    expect(listed[pj.id]).toMatchObject({
      balance: '1500.5',
      hasOpeningBalance: true,
    });

    const again = await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${pj.id}/opening-balance`)
      .set(auth(session.accessToken))
      .send({ amount: 10 })
      .expect(409);
    expect(again.body.error.code).toBe('OPENING_BALANCE_ALREADY_SET');

    const negative = await account(session.accessToken, {
      name: 'Cheque especial',
    });
    await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${negative.id}/opening-balance`)
      .set(auth(session.accessToken))
      .send({ amount: -200 })
      .expect(201);

    expect(await dre(session.accessToken)).toMatchObject({
      grossRevenue: before.grossRevenue,
      expenses: before.expenses,
      netProfit: before.netProfit,
    });
  });

  it('conferir saldo: lança só a diferença, com motivo; repetir não duplica (regra 9)', async () => {
    const session = await registerCompany(app);
    const pj = await account(session.accessToken, { name: 'Conta PJ' });
    await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${pj.id}/opening-balance`)
      .set(auth(session.accessToken))
      .send({ amount: 1000 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${pj.id}/reconcile`)
      .set(auth(session.accessToken))
      .send({ actualBalance: 980 })
      .expect(400);

    const first = await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${pj.id}/reconcile`)
      .set(auth(session.accessToken))
      .send({ actualBalance: 987.35, reason: 'Tarifa bancária do mês' })
      .expect(201);
    expect(first.body).toEqual({
      adjusted: true,
      difference: '-12.65',
      balance: '987.35',
    });

    const second = await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${pj.id}/reconcile`)
      .set(auth(session.accessToken))
      .send({ actualBalance: 987.35, reason: 'Conferência repetida' })
      .expect(201);
    expect(second.body.adjusted).toBe(false);
    expect((await balances(session.accessToken))[pj.id].balance).toBe('987.35');

    const audit = await request(app.getHttpServer())
      .get('/api/v1/audit?entityType=financial_account')
      .set(auth(session.accessToken))
      .expect(200);
    expect(
      audit.body.map((entry: { action: string }) => entry.action),
    ).toContain('financial_account.balance_reconciled');
    expect((await dre(session.accessToken)).expenses).toBe('0');
  });

  it('conta do proprietário: despesa entra no lucro, fica fora do dinheiro da loja; reembolso e aporte (regras 10–11)', async () => {
    const session = await registerCompany(app);
    const pj = await account(session.accessToken, { name: 'Conta PJ' });
    const owner = await account(session.accessToken, {
      name: 'Meu bolso',
      kind: 'owner',
    });
    expect(owner.kind).toBe('owner');

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/financial-accounts')
      .set(auth(session.accessToken))
      .send({ name: 'Outro bolso', kind: 'owner' })
      .expect(409);
    expect(duplicate.body.error.code).toBe('OWNER_ACCOUNT_EXISTS');

    await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${pj.id}/opening-balance`)
      .set(auth(session.accessToken))
      .send({ amount: 1000 })
      .expect(201);

    // Paguei uma despesa da loja do meu bolso.
    await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set(auth(session.accessToken))
      .send({
        description: 'Sacolas',
        category: 'embalagem',
        amount: 300,
        competenceDate: civil(now),
        paidNow: true,
        financialAccountId: owner.id,
      })
      .expect(201);

    expect((await balances(session.accessToken))[owner.id].balance).toBe(
      '-300',
    );
    expect((await dre(session.accessToken)).expenses).toBe('300');
    // Dinheiro da loja = só a Conta PJ (1000), sem os −300 do bolso.
    expect((await dashboard(session.accessToken)).cashBalance).toBe('1000');

    // Reembolso parcial: transferência da loja para o bolso (neutra no resultado).
    await request(app.getHttpServer())
      .post('/api/v1/cash-flow/transfers')
      .set(auth(session.accessToken))
      .send({ fromAccountId: pj.id, toAccountId: owner.id, amount: 100 })
      .expect(201);
    let listed = await balances(session.accessToken);
    expect(listed[owner.id].balance).toBe('-200');
    expect(listed[pj.id].balance).toBe('900');
    expect((await dre(session.accessToken)).expenses).toBe('300');

    // Aporte não pode passar do que a loja deve.
    const tooMuch = await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${owner.id}/owner-contribution`)
      .set(auth(session.accessToken))
      .send({ amount: 250 })
      .expect(400);
    expect(tooMuch.body.error.code).toBe('CONTRIBUTION_EXCEEDS_DEBT');

    await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${owner.id}/owner-contribution`)
      .set(auth(session.accessToken))
      .set('Idempotency-Key', 'aporte-1')
      .send({ amount: 200, note: 'Fica como investimento' })
      .expect(201);
    // Mesma chave não duplica o aporte.
    await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${owner.id}/owner-contribution`)
      .set(auth(session.accessToken))
      .set('Idempotency-Key', 'aporte-1')
      .send({ amount: 200, note: 'Fica como investimento' })
      .expect(201);
    listed = await balances(session.accessToken);
    expect(listed[owner.id].balance).toBe('0');
    const result = await dre(session.accessToken);
    expect(result).toMatchObject({ grossRevenue: '0', expenses: '300' });
    expect((await dashboard(session.accessToken)).cashBalance).toBe('900');

    // Aporte só na conta do proprietário.
    const wrong = await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${pj.id}/owner-contribution`)
      .set(auth(session.accessToken))
      .send({ amount: 10 })
      .expect(400);
    expect(wrong.body.error.code).toBe('NOT_OWNER_ACCOUNT');
  });

  it('empresa B não lança saldo, conferência nem aporte em conta da empresa A (TA-TENANT-004)', async () => {
    const companyA = await registerCompany(app, {
      companyName: 'Financeiro A',
    });
    const companyB = await registerCompany(app, {
      companyName: 'Financeiro B',
    });
    const ownerA = await account(companyA.accessToken, {
      name: 'Bolso A',
      kind: 'owner',
    });
    for (const [path, body] of [
      ['opening-balance', { amount: 100 }],
      ['reconcile', { actualBalance: 50, reason: 'teste B' }],
      ['owner-contribution', { amount: 1 }],
    ] as const) {
      await request(app.getHttpServer())
        .post(`/api/v1/financial-accounts/${ownerA.id}/${path}`)
        .set(auth(companyB.accessToken))
        .send(body)
        .expect(404);
    }
    // Empresa B pode ter a própria conta do proprietário.
    await account(companyB.accessToken, { name: 'Bolso B', kind: 'owner' });
    expect((await balances(companyB.accessToken))[ownerA.id]).toBeUndefined();
  });

  it('sem permissão de gerenciar contas, não lança ajustes (TA-SEC-001)', async () => {
    const session = await registerCompany(app);
    const pj = await account(session.accessToken, { name: 'Conta PJ' });
    const sellerToken = await switchRole(app, session, 'sales');
    await request(app.getHttpServer())
      .post(`/api/v1/financial-accounts/${pj.id}/reconcile`)
      .set(auth(sellerToken))
      .send({ actualBalance: 10, reason: 'tentativa' })
      .expect(403);
  });
});

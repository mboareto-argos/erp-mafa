/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- respostas HTTP do supertest não são tipadas neste nível */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createPaymentMethod, receiveStock } from './utils/sales-helpers';
import { switchRole } from './utils/role-helpers';

// BR §10.9, regras 9 a 11: consentimento com data e origem, público da
// campanha só entre quem aceitou, e envio 1 a 1 marcado por cliente.
describe('Campanhas e consentimento (inclui isolamento multiempresa)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());
  const thisMonth = new Date().getUTCMonth();
  // Dia 15 evita virada de mês por fuso.
  const birthday = (monthOffset: number) =>
    new Date(Date.UTC(1990, (thisMonth + monthOffset + 12) % 12, 15))
      .toISOString()
      .slice(0, 10);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await app.close();
  });

  async function customer(token: string, body: Record<string, unknown>) {
    const response = await http()
      .post('/api/v1/customers')
      .set(auth(token))
      .send(body)
      .expect(201);
    return response.body as { id: string };
  }

  async function campaign(token: string, body: Record<string, unknown>) {
    const response = await http()
      .post('/api/v1/campaigns')
      .set(auth(token))
      .send({ title: 'Promo', message: 'Oi {nome}!', ...body })
      .expect(201);
    return response.body as { id: string };
  }

  const detail = async (token: string, id: string) =>
    (await http().get(`/api/v1/campaigns/${id}`).set(auth(token)).expect(200))
      .body;
  // Leitura direta do banco precisa do contexto da empresa (RLS).
  const asTenant = <T>(companyId: string, fn: () => Promise<T>) =>
    prisma.withTenant(companyId, fn);
  const names = (body: any) =>
    body.recipients.map((recipient: any) => recipient.name).sort();

  async function sellTo(
    token: string,
    customerId: string,
    variantId: string,
    paymentMethodId: string,
  ) {
    const sale = await http()
      .post('/api/v1/sales')
      .set(auth(token))
      .send({
        channel: 'presencial',
        customerId,
        items: [{ productVariantId: variantId, quantity: 1, unitPrice: 100 }],
      })
      .expect(201);
    await http()
      .post(`/api/v1/sales/${sale.body.id}/confirm`)
      .set(auth(token))
      .send({ payments: [{ paymentMethodId, amount: 100 }] })
      .expect(201);
    return sale.body.id as string;
  }

  it('consentimento: aceite com data e origem, saída e auditoria (regra 9)', async () => {
    const { accessToken: token, company } = await registerCompany(app);
    const ana = await customer(token, {
      name: 'Ana',
      whatsapp: '11999990001',
      marketingConsentSource: 'in_person',
    });
    let saved = await asTenant(company.id, () =>
      prisma.customer.findUniqueOrThrow({ where: { id: ana.id } }),
    );
    expect(saved.marketingConsentAt).not.toBeNull();
    expect(saved.marketingConsentSource).toBe('in_person');

    await http()
      .put(`/api/v1/customers/${ana.id}/marketing-consent`)
      .set(auth(token))
      .send({ granted: false })
      .expect(200);
    saved = await asTenant(company.id, () =>
      prisma.customer.findUniqueOrThrow({ where: { id: ana.id } }),
    );
    expect(saved.marketingOptOutAt).not.toBeNull();

    await http()
      .put(`/api/v1/customers/${ana.id}/marketing-consent`)
      .set(auth(token))
      .send({ granted: true })
      .expect(400);
    await http()
      .put(`/api/v1/customers/${ana.id}/marketing-consent`)
      .set(auth(token))
      .send({ granted: true, source: 'whatsapp' })
      .expect(200);
    saved = await asTenant(company.id, () =>
      prisma.customer.findUniqueOrThrow({ where: { id: ana.id } }),
    );
    expect(saved.marketingOptOutAt).toBeNull();
    expect(saved.marketingConsentSource).toBe('whatsapp');

    const logs = await asTenant(company.id, () =>
      prisma.auditLog.findMany({
        where: { companyId: company.id, entityId: ana.id },
        orderBy: { createdAt: 'asc' },
      }),
    );
    expect(logs.map((log) => log.action)).toEqual([
      'customer.marketing_consent_granted',
      'customer.marketing_consent_revoked',
      'customer.marketing_consent_granted',
    ]);
  });

  it('público "todos": só ativos que aceitaram; sem telefone só é contado', async () => {
    const { accessToken: token } = await registerCompany(app);
    await customer(token, {
      name: 'Aceitou',
      whatsapp: '11999990001',
      marketingConsentSource: 'in_person',
    });
    await customer(token, { name: 'Não aceitou', whatsapp: '11999990002' });
    await customer(token, {
      name: 'Sem telefone',
      marketingConsentSource: 'instagram',
    });
    const left = await customer(token, {
      name: 'Saiu',
      whatsapp: '11999990003',
      marketingConsentSource: 'in_person',
    });
    await http()
      .put(`/api/v1/customers/${left.id}/marketing-consent`)
      .set(auth(token))
      .send({ granted: false })
      .expect(200);
    const inactive = await customer(token, {
      name: 'Inativo',
      whatsapp: '11999990004',
      marketingConsentSource: 'in_person',
    });
    await http()
      .patch(`/api/v1/customers/${inactive.id}/deactivate`)
      .set(auth(token))
      .expect(200);

    const preview = await http()
      .post('/api/v1/campaigns/preview')
      .set(auth(token))
      .send({ audience: 'all' })
      .expect(201);
    expect(preview.body).toEqual({ count: 1, withoutPhone: 1 });

    const created = await campaign(token, { audience: 'all' });
    const body = await detail(token, created.id);
    expect(names(body)).toEqual(['Aceitou']);
    expect(body.withoutPhone).toBe(1);
  });

  it('públicos: aniversariantes do mês, quem comprou a marca e sem comprar há X dias', async () => {
    const { accessToken: token, company } = await registerCompany(app);
    const consent = { marketingConsentSource: 'in_person' };
    await customer(token, {
      name: 'Faz aniversário',
      whatsapp: '11900000001',
      birthDate: birthday(0),
      ...consent,
    });
    await customer(token, {
      name: 'Mês que vem',
      whatsapp: '11900000002',
      birthDate: birthday(1),
      ...consent,
    });
    const fan = await customer(token, {
      name: 'Comprou a marca',
      whatsapp: '11900000003',
      ...consent,
    });
    const recent = await customer(token, {
      name: 'Comprou outra coisa',
      whatsapp: '11900000004',
      ...consent,
    });

    const brand = await http()
      .post('/api/v1/catalog/brands')
      .set(auth(token))
      .send({ name: 'Lattafa' })
      .expect(201);
    const branded = await http()
      .post('/api/v1/catalog/products')
      .set(auth(token))
      .send({
        sku: `LAT-${Date.now()}`,
        name: 'Yara',
        unit: 'un',
        brandId: brand.body.id,
      })
      .expect(201);
    const other = await http()
      .post('/api/v1/catalog/products')
      .set(auth(token))
      .send({ sku: `OUT-${Date.now()}`, name: 'Outro', unit: 'un' })
      .expect(201);
    const brandedVariant = branded.body.variants[0].id;
    const otherVariant = other.body.variants[0].id;
    await receiveStock(app, token, brandedVariant, 5, 50);
    await receiveStock(app, token, otherVariant, 5, 50);
    const account = await http()
      .post('/api/v1/financial-accounts')
      .set(auth(token))
      .send({ name: 'Caixa' })
      .expect(201);
    const method = await createPaymentMethod(app, token, {
      financialAccountId: account.body.id,
    });
    const oldSale = await sellTo(token, fan.id, brandedVariant, method.id);
    await sellTo(token, recent.id, otherVariant, method.id);
    // A compra da marca foi há 60 dias.
    await asTenant(company.id, () =>
      prisma.sale.update({
        where: { id: oldSale },
        data: { createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
      }),
    );

    const birthdays = await campaign(token, { audience: 'birthdays' });
    expect(names(await detail(token, birthdays.id))).toEqual([
      'Faz aniversário',
    ]);

    const byBrand = await campaign(token, {
      audience: 'brand',
      audienceBrandId: brand.body.id,
    });
    expect(names(await detail(token, byBrand.id))).toEqual(['Comprou a marca']);

    const inactive = await campaign(token, {
      audience: 'inactive',
      audienceInactiveDays: 30,
    });
    // Nunca comprou não entra; comprou recentemente não entra.
    expect(names(await detail(token, inactive.id))).toEqual([
      'Comprou a marca',
    ]);

    await http()
      .post('/api/v1/campaigns')
      .set(auth(token))
      .send({ title: 'x', message: 'y', audience: 'brand' })
      .expect(400);
  });

  it('envio 1 a 1: marca enviado (sem duplicar), recusa quem não está no público, arquivar mantém o histórico', async () => {
    const { accessToken: token, company } = await registerCompany(app);
    const ana = await customer(token, {
      name: 'Ana',
      whatsapp: '11999990001',
      marketingConsentSource: 'in_person',
    });
    const bia = await customer(token, { name: 'Bia', whatsapp: '1198' });
    const created = await campaign(token, { audience: 'all' });

    await http()
      .post(`/api/v1/campaigns/${created.id}/deliveries`)
      .set(auth(token))
      .send({ customerId: ana.id })
      .expect(201);
    await http()
      .post(`/api/v1/campaigns/${created.id}/deliveries`)
      .set(auth(token))
      .send({ customerId: ana.id })
      .expect(201);
    await http()
      .post(`/api/v1/campaigns/${created.id}/deliveries`)
      .set(auth(token))
      .send({ customerId: bia.id })
      .expect(400)
      .expect((res) =>
        expect(res.body.error.code).toBe('CUSTOMER_NOT_IN_AUDIENCE'),
      );

    const body = await detail(token, created.id);
    expect(body.sentCount).toBe(1);
    expect(body.recipients[0].sentAt).not.toBeNull();

    await http()
      .patch(`/api/v1/campaigns/${created.id}/archive`)
      .set(auth(token))
      .expect(200);
    await http()
      .get(`/api/v1/campaigns/${created.id}`)
      .set(auth(token))
      .expect(404);
    const list = await http()
      .get('/api/v1/campaigns')
      .set(auth(token))
      .expect(200);
    expect(list.body).toHaveLength(0);
    expect(
      await asTenant(company.id, () =>
        prisma.campaignDelivery.count({
          where: { campaignId: created.id },
        }),
      ),
    ).toBe(1);
  });

  it('multiempresa: outra empresa não vê nem altera a campanha, nem usa marca ou cliente de fora', async () => {
    const owner = await registerCompany(app);
    const token = owner.accessToken;
    const ana = await customer(token, {
      name: 'Ana',
      whatsapp: '11999990001',
      marketingConsentSource: 'in_person',
    });
    const brand = await http()
      .post('/api/v1/catalog/brands')
      .set(auth(token))
      .send({ name: 'Marca A' })
      .expect(201);
    const created = await campaign(token, { audience: 'all' });

    const intruder = (await registerCompany(app)).accessToken;
    await http()
      .get(`/api/v1/campaigns/${created.id}`)
      .set(auth(intruder))
      .expect(404);
    await http()
      .patch(`/api/v1/campaigns/${created.id}`)
      .set(auth(intruder))
      .send({ title: 'Invadida' })
      .expect(404);
    await http()
      .post(`/api/v1/campaigns/${created.id}/deliveries`)
      .set(auth(intruder))
      .send({ customerId: ana.id })
      .expect(404);
    const list = await http()
      .get('/api/v1/campaigns')
      .set(auth(intruder))
      .expect(200);
    expect(list.body).toHaveLength(0);
    await http()
      .post('/api/v1/campaigns')
      .set(auth(intruder))
      .send({
        title: 'x',
        message: 'y',
        audience: 'brand',
        audienceBrandId: brand.body.id,
      })
      .expect(400);
    await http()
      .put(`/api/v1/customers/${ana.id}/marketing-consent`)
      .set(auth(intruder))
      .send({ granted: false })
      .expect(404);
    const own = await campaign(intruder, { audience: 'all' });
    await http()
      .post(`/api/v1/campaigns/${own.id}/deliveries`)
      .set(auth(intruder))
      .send({ customerId: ana.id })
      .expect(400);

    // Controle positivo: a dona continua vendo a cliente no público.
    expect(names(await detail(token, created.id))).toEqual(['Ana']);
  });

  it('permissão: financeiro só vê; estoque não vê campanhas (backend)', async () => {
    const session = await registerCompany(app);
    const created = await campaign(session.accessToken, { audience: 'all' });
    const finance = await switchRole(app, session, 'finance');
    await http()
      .get(`/api/v1/campaigns/${created.id}`)
      .set(auth(finance))
      .expect(200);
    await http()
      .post('/api/v1/campaigns')
      .set(auth(finance))
      .send({ title: 'x', message: 'y', audience: 'all' })
      .expect(403);
    const stock = await switchRole(app, session, 'inventory');
    await http().get('/api/v1/campaigns').set(auth(stock)).expect(403);
  });
});

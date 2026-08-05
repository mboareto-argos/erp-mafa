import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';

describe('RLS no PostgreSQL (TA-DATA-005)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('nega leitura sem contexto e não vaza dados mesmo com filtro explícito de outra empresa', async () => {
    const companyA = await registerCompany(app, { companyName: 'RLS A' });
    const companyB = await registerCompany(app, { companyName: 'RLS B' });
    await createProduct(app, companyA.accessToken, {
      name: 'Produto protegido',
    });

    const withoutContext = await prisma.product.findMany({
      where: { companyId: companyA.company.id },
    });
    expect(withoutContext).toHaveLength(0);

    const visibleToA = await prisma.withTenant(companyA.company.id, () =>
      prisma.product.findMany({ where: { companyId: companyA.company.id } }),
    );
    expect(visibleToA).toHaveLength(1);

    const visibleToB = await prisma.withTenant(companyB.company.id, () =>
      prisma.product.findMany({ where: { companyId: companyA.company.id } }),
    );
    expect(visibleToB).toHaveLength(0);

    const apiAsB = await request(app.getHttpServer())
      .get('/api/v1/catalog/products')
      .set('Authorization', `Bearer ${companyB.accessToken}`)
      .expect(200);
    expect(apiAsB.body).toHaveLength(0);
  });
});

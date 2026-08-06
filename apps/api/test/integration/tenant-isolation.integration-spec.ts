/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';

// TA-TENANT-004: todo modulo critico precisa de um cenario com duas empresas
// verificando que uma nunca enxerga/altera dados da outra — aqui aplicado ao
// Catalog, que e' a base sobre a qual o Inventory (proximo passo) vai
// construir a resolucao de tenant.
describe('Isolamento multiempresa — Catalog', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('empresa B nunca vê, edita ou inativa dados de categoria da empresa A', async () => {
    const companyA = await registerCompany(app, { companyName: 'Empresa A' });
    const companyB = await registerCompany(app, { companyName: 'Empresa B' });

    const categoryA = await request(app.getHttpServer())
      .post('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${companyA.accessToken}`)
      .send({ name: 'Categoria da Empresa A' })
      .expect(201);

    // B lista categorias e não vê nada de A.
    const listAsB = await request(app.getHttpServer())
      .get('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${companyB.accessToken}`)
      .expect(200);
    expect(listAsB.body).toHaveLength(0);

    // B tenta inativar a categoria de A pelo id (mesmo sabendo o id) — nunca
    // deve funcionar, e a resposta não deve revelar se o registro existe
    // (404 igual a "não existe", nunca 403 "existe mas não é sua").
    await request(app.getHttpServer())
      .patch(`/api/v1/catalog/categories/${categoryA.body.id}/deactivate`)
      .set('Authorization', `Bearer ${companyB.accessToken}`)
      .expect(404);

    // A categoria de A continua intacta.
    const listAsA = await request(app.getHttpServer())
      .get('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${companyA.accessToken}`)
      .expect(200);
    expect(listAsA.body).toHaveLength(1);
    expect(listAsA.body[0].status).toBe('active');
  });

  it('empresa B não consegue usar uma categoria/marca da empresa A ao criar produto', async () => {
    const companyA = await registerCompany(app, { companyName: 'Empresa A2' });
    const companyB = await registerCompany(app, { companyName: 'Empresa B2' });

    const categoryA = await request(app.getHttpServer())
      .post('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${companyA.accessToken}`)
      .send({ name: 'Categoria só de A' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/catalog/products')
      .set('Authorization', `Bearer ${companyB.accessToken}`)
      .send({
        sku: 'SKU-CROSS-TENANT',
        name: 'Produto B',
        unit: 'un',
        categoryId: categoryA.body.id,
      })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_CATEGORY');
  });

  it('mesmo SKU pode existir em empresas diferentes (unicidade é por empresa — TA-DATA-003)', async () => {
    const companyA = await registerCompany(app, { companyName: 'Empresa A3' });
    const companyB = await registerCompany(app, { companyName: 'Empresa B3' });

    for (const company of [companyA, companyB]) {
      await request(app.getHttpServer())
        .post('/api/v1/catalog/products')
        .set('Authorization', `Bearer ${company.accessToken}`)
        .send({
          sku: 'SKU-SHARED',
          name: 'Produto com SKU repetido entre empresas',
          unit: 'un',
        })
        .expect(201);
    }
  });

  it('empresa B não acessa o detalhe e o histórico de preço do produto da empresa A', async () => {
    const companyA = await registerCompany(app, { companyName: 'Empresa A4' });
    const companyB = await registerCompany(app, { companyName: 'Empresa B4' });

    const productA = await request(app.getHttpServer())
      .post('/api/v1/catalog/products')
      .set('Authorization', `Bearer ${companyA.accessToken}`)
      .send({
        sku: 'SKU-DETAIL-A',
        name: 'Produto privado A',
        unit: 'un',
        salePrice: 50,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/catalog/products/${productA.body.id}`)
      .set('Authorization', `Bearer ${companyB.accessToken}`)
      .expect(404);
  });
});

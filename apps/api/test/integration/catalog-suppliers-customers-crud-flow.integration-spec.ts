/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- respostas HTTP de supertest/Nest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { registerCompany } from './utils/auth-helpers';
import { createProduct } from './utils/catalog-helpers';
import { PrismaService } from '../../src/prisma/prisma.service';

// Cobre a rodada de fechamento de débito: update/reactivate/reprice em
// Products, e update/reactivate + paginação/busca em Products, Suppliers e
// Customers (nenhum desses endpoints existia além de create/list/deactivate).
describe('Edição, reativação, reprecificação e paginação — Products, Suppliers, Customers', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createSupplier(
    accessToken: string,
    name = 'Fornecedor Teste',
  ): Promise<{ id: string }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/purchasing/suppliers')
      .set(auth(accessToken))
      .send({ name })
      .expect(201);
    return response.body as { id: string };
  }

  async function createCustomer(
    accessToken: string,
    name = 'Cliente Teste',
  ): Promise<{ id: string }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(accessToken))
      .send({ name })
      .expect(201);
    return response.body as { id: string };
  }

  describe('Products', () => {
    it('edita campos cadastrais sem tocar em preço/custo', async () => {
      const session = await registerCompany(app);
      const product = await createProduct(app, session.accessToken, {
        name: 'Nome Original',
      });

      const updated = await request(app.getHttpServer())
        .patch(`/api/v1/catalog/products/${product.id}`)
        .set(auth(session.accessToken))
        .send({ name: 'Nome Atualizado', minStock: 5 })
        .expect(200);

      expect(updated.body.name).toBe('Nome Atualizado');
      expect(updated.body.minStock).toBe('5');
    });

    it('rejeita edição de SKU para um valor já em uso', async () => {
      const session = await registerCompany(app);
      await createProduct(app, session.accessToken, { sku: 'SKU-A' });
      const productB = await createProduct(app, session.accessToken, {
        sku: 'SKU-B',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/catalog/products/${productB.id}`)
        .set(auth(session.accessToken))
        .send({ sku: 'SKU-A' })
        .expect(409);
      expect(response.body.error.code).toBe('SKU_IN_USE');
    });

    it('desativa e reativa um produto (BR US-PROD-002)', async () => {
      const session = await registerCompany(app);
      const product = await createProduct(app, session.accessToken);

      const deactivated = await request(app.getHttpServer())
        .patch(`/api/v1/catalog/products/${product.id}/deactivate`)
        .set(auth(session.accessToken))
        .expect(200);
      expect(deactivated.body.status).toBe('inactive');

      const reactivated = await request(app.getHttpServer())
        .patch(`/api/v1/catalog/products/${product.id}/reactivate`)
        .set(auth(session.accessToken))
        .expect(200);
      expect(reactivated.body.status).toBe('active');
    });

    it('reprecifica gravando um novo ProductPrice (nunca edita o existente) e registra auditoria', async () => {
      const session = await registerCompany(app);
      const product = await createProduct(app, session.accessToken);

      const priceCountBefore = await prisma.withTenant(session.company.id, () =>
        prisma.productPrice.count({ where: { productId: product.id } }),
      );

      const repriced = await request(app.getHttpServer())
        .post(`/api/v1/catalog/products/${product.id}/reprice`)
        .set(auth(session.accessToken))
        .send({ salePrice: 59.9, reason: 'Ajuste de mercado' })
        .expect(201);

      expect(repriced.body.prices[0].salePrice).toBe('59.9');
      expect(repriced.body.prices[0].costPrice).toBe('0');

      const priceCountAfter = await prisma.withTenant(session.company.id, () =>
        prisma.productPrice.count({ where: { productId: product.id } }),
      );
      expect(priceCountAfter).toBe(priceCountBefore + 1);

      const auditLogs = await prisma.withTenant(session.company.id, () =>
        prisma.auditLog.findMany({
          where: {
            companyId: session.company.id,
            action: 'product.repriced',
            entityId: product.id,
          },
        }),
      );
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].reason).toBe('Ajuste de mercado');
    });

    it('rejeita reprecificação sem motivo', async () => {
      const session = await registerCompany(app);
      const product = await createProduct(app, session.accessToken);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/catalog/products/${product.id}/reprice`)
        .set(auth(session.accessToken))
        .send({ salePrice: 59.9 })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejeita custo digitado manualmente na reprecificação (DS-FORM-004)', async () => {
      const session = await registerCompany(app);
      const product = await createProduct(app, session.accessToken);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/catalog/products/${product.id}/reprice`)
        .set(auth(session.accessToken))
        .send({ salePrice: 59.9, costPrice: 20, reason: 'Tentativa manual' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Paginação e busca — retrocompatibilidade', () => {
    it('sem `page`, Products/Suppliers/Customers continuam devolvendo o array completo de sempre', async () => {
      const session = await registerCompany(app);
      await createProduct(app, session.accessToken);
      await createSupplier(session.accessToken);
      await createCustomer(session.accessToken);

      const products = await request(app.getHttpServer())
        .get('/api/v1/catalog/products')
        .set(auth(session.accessToken))
        .expect(200);
      expect(Array.isArray(products.body)).toBe(true);

      const suppliers = await request(app.getHttpServer())
        .get('/api/v1/purchasing/suppliers')
        .set(auth(session.accessToken))
        .expect(200);
      expect(Array.isArray(suppliers.body)).toBe(true);

      const customers = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set(auth(session.accessToken))
        .expect(200);
      expect(Array.isArray(customers.body)).toBe(true);
    });

    it('com `page`, devolve {items,total,page,pageSize} e filtra por busca (q)', async () => {
      const session = await registerCompany(app);
      await createProduct(app, session.accessToken, { name: 'Perfume Rosa' });
      await createProduct(app, session.accessToken, {
        name: 'Sabonete Lavanda',
      });

      const paginated = await request(app.getHttpServer())
        .get('/api/v1/catalog/products?page=1&pageSize=1')
        .set(auth(session.accessToken))
        .expect(200);
      expect(paginated.body.items).toHaveLength(1);
      expect(paginated.body.total).toBe(2);
      expect(paginated.body.page).toBe(1);
      expect(paginated.body.pageSize).toBe(1);

      const searched = await request(app.getHttpServer())
        .get('/api/v1/catalog/products?page=1&q=rosa')
        .set(auth(session.accessToken))
        .expect(200);
      expect(searched.body.items).toHaveLength(1);
      expect(searched.body.items[0].name).toBe('Perfume Rosa');
    });
  });

  describe('Suppliers e Customers — edição/reativação', () => {
    it('edita e reativa um fornecedor', async () => {
      const session = await registerCompany(app);
      const supplier = await createSupplier(session.accessToken);

      const updated = await request(app.getHttpServer())
        .patch(`/api/v1/purchasing/suppliers/${supplier.id}`)
        .set(auth(session.accessToken))
        .send({ contactName: 'Nova Contato' })
        .expect(200);
      expect(updated.body.contactName).toBe('Nova Contato');

      await request(app.getHttpServer())
        .patch(`/api/v1/purchasing/suppliers/${supplier.id}/deactivate`)
        .set(auth(session.accessToken))
        .expect(200);

      const reactivated = await request(app.getHttpServer())
        .patch(`/api/v1/purchasing/suppliers/${supplier.id}/reactivate`)
        .set(auth(session.accessToken))
        .expect(200);
      expect(reactivated.body.status).toBe('active');
    });

    it('edita e reativa um cliente', async () => {
      const session = await registerCompany(app);
      const customer = await createCustomer(session.accessToken);

      const updated = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${customer.id}`)
        .set(auth(session.accessToken))
        .send({ whatsapp: '11999999999' })
        .expect(200);
      expect(updated.body.whatsapp).toBe('11999999999');

      await request(app.getHttpServer())
        .patch(`/api/v1/customers/${customer.id}/deactivate`)
        .set(auth(session.accessToken))
        .expect(200);

      const reactivated = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${customer.id}/reactivate`)
        .set(auth(session.accessToken))
        .expect(200);
      expect(reactivated.body.status).toBe('active');
    });
  });

  describe('Isolamento multiempresa (TA-TENANT-004)', () => {
    it('empresa B não edita, reativa nem reprecifica um produto da empresa A', async () => {
      const companyA = await registerCompany(app, { companyName: 'CRUD A' });
      const companyB = await registerCompany(app, { companyName: 'CRUD B' });
      const product = await createProduct(app, companyA.accessToken);

      await request(app.getHttpServer())
        .patch(`/api/v1/catalog/products/${product.id}`)
        .set(auth(companyB.accessToken))
        .send({ name: 'Invasão' })
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/api/v1/catalog/products/${product.id}/reactivate`)
        .set(auth(companyB.accessToken))
        .expect(404);

      await request(app.getHttpServer())
        .post(`/api/v1/catalog/products/${product.id}/reprice`)
        .set(auth(companyB.accessToken))
        .send({ salePrice: 1, reason: 'Invasão' })
        .expect(404);
    });

    it('empresa B não edita fornecedor/cliente da empresa A', async () => {
      const companyA = await registerCompany(app, {
        companyName: 'CRUD Contatos A',
      });
      const companyB = await registerCompany(app, {
        companyName: 'CRUD Contatos B',
      });
      const supplier = await createSupplier(companyA.accessToken);
      const customer = await createCustomer(companyA.accessToken);

      await request(app.getHttpServer())
        .patch(`/api/v1/purchasing/suppliers/${supplier.id}`)
        .set(auth(companyB.accessToken))
        .send({ name: 'Invasão' })
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/api/v1/customers/${customer.id}`)
        .set(auth(companyB.accessToken))
        .send({ name: 'Invasão' })
        .expect(404);
    });
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- app.getHttpServer()/response.body do supertest não são tipados */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

let counter = 0;

export async function createProduct(
  app: INestApplication,
  accessToken: string,
  overrides: Partial<{
    sku: string;
    name: string;
    unit: string;
    minStock: number;
  }> = {},
) {
  counter += 1;
  const payload = {
    sku: overrides.sku ?? `SKU-${Date.now()}-${counter}`,
    name: overrides.name ?? 'Produto de teste',
    unit: overrides.unit ?? 'un',
    ...(overrides.minStock !== undefined
      ? { minStock: overrides.minStock }
      : {}),
  };

  const response = await request(app.getHttpServer())
    .post('/api/v1/catalog/products')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
    .expect(201);

  return response.body;
}

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- respostas HTTP de supertest não são tipadas neste nível de teste de integração */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function createFinancialAccount(
  app: INestApplication,
  accessToken: string,
  overrides: Partial<{ name: string }> = {},
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/financial-accounts')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: overrides.name ?? 'Caixa' })
    .expect(201);
  return response.body;
}

export async function getAccountBalance(
  app: INestApplication,
  accessToken: string,
  accountId: string,
) {
  const response = await request(app.getHttpServer())
    .get(`/api/v1/financial-accounts/${accountId}/balance`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);
  return response.body.balance as string;
}

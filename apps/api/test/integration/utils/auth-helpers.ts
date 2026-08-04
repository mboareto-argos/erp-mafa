/* eslint-disable @typescript-eslint/no-unsafe-argument -- app.getHttpServer() do supertest não é tipado */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

let counter = 0;

export function uniqueEmail(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@erp-mafa-tests.local`;
}

// Registra uma empresa+usuario novos via /auth/register e devolve a sessao
// ja autenticada (mesmo fluxo que um usuario real faria).
export async function registerCompany(
  app: INestApplication,
  overrides: Partial<{
    name: string;
    email: string;
    password: string;
    companyName: string;
  }> = {},
) {
  const payload = {
    name: overrides.name ?? 'Usuário de Teste',
    email: overrides.email ?? uniqueEmail('owner'),
    password: overrides.password ?? 'senha-forte-123',
    companyName: overrides.companyName ?? 'Empresa de Teste',
  };

  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(payload)
    .expect(201);

  return { ...response.body, credentials: payload } as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; name: string; email: string };
    company: { id: string; name: string };
    roleName: string;
    permissions: string[];
    credentials: typeof payload;
  };
}

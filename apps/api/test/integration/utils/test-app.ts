import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';

// Sobe a aplicacao real (mesmos modulos/guards/filters de src/main.ts) contra
// o Postgres de teste (apps/api/.env.test) — cenario de integracao de
// verdade, nao mocks (docs/testing/test-strategy.md).
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return app;
}

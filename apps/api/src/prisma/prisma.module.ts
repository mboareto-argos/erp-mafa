import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { TenantTransactionInterceptor } from './tenant-transaction.interceptor';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: APP_INTERCEPTOR, useClass: TenantTransactionInterceptor },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}

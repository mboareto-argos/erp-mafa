import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  imports: [PassportModule],
  controllers: [CompanyController],
  providers: [JwtStrategy, JwtAuthGuard, PermissionsGuard, CompanyService],
  exports: [JwtAuthGuard, PermissionsGuard],
})
export class TenancyModule {}

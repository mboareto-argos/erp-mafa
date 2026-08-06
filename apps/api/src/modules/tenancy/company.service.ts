import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CurrentTenantContext } from './jwt-payload.interface';
import type { UpdateCompanyDto } from './dto/update-company.schema';
import type { ProfitDistributionDto } from './dto/profit-distribution.schema';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  get(companyId: string) {
    return this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, name: true, document: true, segment: true, email: true, phone: true, currency: true, timezone: true, operationStartDate: true, brandAccentColor: true, allowNegativeStock: true, allocationMethod: true, defaultMinStock: true, discountLimit: true, status: true },
    });
  }

  async update(tenant: CurrentTenantContext, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findFirst({ where: { id: tenant.companyId, deletedAt: null } });
    if (!company) throw new AppError('COMPANY_NOT_FOUND', 'Empresa não encontrada.', HttpStatus.NOT_FOUND);

    if (company.currency !== dto.currency) {
      const operations = await this.prisma.$transaction([
        this.prisma.sale.count({ where: { companyId: tenant.companyId } }),
        this.prisma.purchase.count({ where: { companyId: tenant.companyId } }),
        this.prisma.financialTransaction.count({ where: { companyId: tenant.companyId } }),
      ]);
      if (operations.some(count => count > 0)) throw new AppError('COMPANY_CURRENCY_LOCKED', 'A moeda principal não pode ser alterada depois do início das operações.', HttpStatus.CONFLICT, 'currency');
    }

    const data = {
      name: dto.name,
      document: dto.document || null,
      segment: dto.segment || null,
      email: dto.email || null,
      phone: dto.phone || null,
      currency: dto.currency,
      timezone: dto.timezone,
      operationStartDate: dto.operationStartDate ? new Date(`${dto.operationStartDate}T00:00:00.000Z`) : null,
      brandAccentColor: dto.brandAccentColor.toUpperCase(),
      allowNegativeStock: dto.allowNegativeStock,
      allocationMethod: dto.allocationMethod,
      defaultMinStock: dto.defaultMinStock ? new Prisma.Decimal(dto.defaultMinStock.replace(',', '.')) : null,
      discountLimit: dto.discountLimit ? new Prisma.Decimal(dto.discountLimit.replace(',', '.')) : null,
    };

    return this.prisma.$transaction(async tx => {
      const updated = await tx.company.update({ where: { id: tenant.companyId }, data });
      await this.audit.record(tx, { companyId: tenant.companyId, userId: tenant.userId, action: 'company.settings_updated', entityType: 'company', entityId: tenant.companyId, beforeData: this.auditSnapshot(company), afterData: this.auditSnapshot(updated) });
      return updated;
    });
  }

  listProfitDistribution(companyId: string) {
    return this.prisma.profitDistributionPolicy.findMany({ where: { companyId, deletedAt: null }, orderBy: { effectiveFrom: 'desc' } });
  }

  async saveProfitDistribution(tenant: CurrentTenantContext, dto: ProfitDistributionDto) {
    return this.prisma.$transaction(async tx => {
      const policy = await tx.profitDistributionPolicy.upsert({
        where: { companyId_effectiveFrom: { companyId: tenant.companyId, effectiveFrom: dto.effectiveFrom } },
        create: { companyId: tenant.companyId, effectiveFrom: dto.effectiveFrom, reinvestmentRate: dto.reinvestmentRate, proLaboreRate: dto.proLaboreRate, reserveRate: dto.reserveRate, marketingRate: dto.marketingRate, createdBy: tenant.userId },
        update: { reinvestmentRate: dto.reinvestmentRate, proLaboreRate: dto.proLaboreRate, reserveRate: dto.reserveRate, marketingRate: dto.marketingRate, deletedAt: null },
      });
      await this.audit.record(tx, { companyId: tenant.companyId, userId: tenant.userId, action: 'company.profit_distribution_updated', entityType: 'profit_distribution_policy', entityId: policy.id, afterData: { effectiveFrom: policy.effectiveFrom, reinvestmentRate: policy.reinvestmentRate.toString(), proLaboreRate: policy.proLaboreRate.toString(), reserveRate: policy.reserveRate.toString(), marketingRate: policy.marketingRate.toString() } });
      return policy;
    });
  }

  private auditSnapshot(company: { name: string; document: string | null; segment: string | null; email: string | null; phone: string | null; currency: string; timezone: string; brandAccentColor: string; allowNegativeStock: boolean; allocationMethod: string; defaultMinStock: Prisma.Decimal | null; discountLimit: Prisma.Decimal | null }) {
    return { name: company.name, document: company.document, segment: company.segment, email: company.email, phone: company.phone, currency: company.currency, timezone: company.timezone, brandAccentColor: company.brandAccentColor, allowNegativeStock: company.allowNegativeStock, allocationMethod: company.allocationMethod, defaultMinStock: company.defaultMinStock?.toString() ?? null, discountLimit: company.discountLimit?.toString() ?? null };
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma, SaleStatus, SalesChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CurrentTenantContext } from '../tenancy/jwt-payload.interface';
import {
  calculateAverageTicket,
  calculateMargin,
  calculatePercentChange,
  calculateDre,
} from './reporting-calculations';

// Vendas canceladas/rascunho nunca compõem faturamento (RN 10.10.24) — só
// vendas efetivamente confirmadas (mesmo que parcial/totalmente devolvidas
// depois, o que já fica refletido em total/cmvCalculated recalculados).
const COUNTED_SALE_STATUSES: SaleStatus[] = [
  'confirmed',
  'partially_returned',
  'returned',
];

@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  async getDashboard(tenant: CurrentTenantContext, from: Date, to: Date) {
    const canViewCost = tenant.permissions.includes('view_cost');
    const canViewProfit = tenant.permissions.includes('view_profit');

    const periodMs = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - periodMs);

    const [
      current,
      previous,
      expensesRealized,
      inventorySummary,
      receivablesOpen,
      payablesOpen,
      cashBalance,
    ] = await Promise.all([
      this.getSalesSummary(tenant.companyId, from, to),
      this.getSalesSummary(tenant.companyId, previousFrom, previousTo),
      this.getRealizedExpenses(tenant.companyId, from, to),
      this.getInventorySummary(tenant.companyId),
      this.getReceivablesOpenBalance(tenant.companyId),
      this.getPayablesOpenBalance(tenant.companyId),
      this.getConsolidatedCashBalance(tenant.companyId),
    ]);

    const netProfitEstimated = current.grossProfit
      .sub(current.paymentFees)
      .sub(expensesRealized);
    const previousNetProfitEstimated = previous.grossProfit
      .sub(previous.paymentFees)
      .sub(
        await this.getRealizedExpenses(
          tenant.companyId,
          previousFrom,
          previousTo,
        ),
      );

    const lowStock = await this.inventory.getLowStock(tenant.companyId);
    const productsCount = await this.prisma.product.count({
      where: { companyId: tenant.companyId, status: 'active', deletedAt: null },
    });

    const base = {
      period: { from, to },
      revenueGross: current.grossRevenue.toString(),
      revenueNet: current.netRevenue.toString(),
      salesCount: current.salesCount,
      averageTicket:
        calculateAverageTicket(
          current.netRevenue,
          current.salesCount,
        )?.toString() ?? null,
      expensesRealized: expensesRealized.toString(),
      productsCount,
      lowStockCount: lowStock.length,
      inventoryValue: inventorySummary.toString(),
      receivablesOpen: receivablesOpen.toString(),
      payablesOpen: payablesOpen.toString(),
      cashBalance: cashBalance.toString(),
      comparison: {
        revenueNetChangePercent:
          calculatePercentChange(
            current.netRevenue,
            previous.netRevenue,
          )?.toString() ?? null,
        salesCountChangePercent:
          calculatePercentChange(
            current.salesCount,
            previous.salesCount,
          )?.toString() ?? null,
      },
    };

    // RN 10.17.2: quem não tem view_cost/view_profit nunca recebe CMV/lucro
    // no dashboard — omitido no servidor, não só escondido no frontend.
    if (!canViewCost) {
      return base;
    }
    const withCost = { ...base, cmv: current.cmv.toString() };
    if (!canViewProfit) {
      return withCost;
    }

    return {
      ...withCost,
      grossProfit: current.grossProfit.toString(),
      netProfitEstimated: netProfitEstimated.toString(),
      margin:
        calculateMargin(current.grossProfit, current.netRevenue)?.toString() ??
        null,
      comparison: {
        ...base.comparison,
        grossProfitChangePercent:
          calculatePercentChange(
            current.grossProfit,
            previous.grossProfit,
          )?.toString() ?? null,
        netProfitChangePercent:
          calculatePercentChange(
            netProfitEstimated,
            previousNetProfitEstimated,
          )?.toString() ?? null,
      },
    };
  }

  async getDre(companyId: string, from: Date, to: Date) {
    const summary = await this.getSalesSummary(companyId, from, to);
    const expenses = await this.getRealizedExpenses(companyId, from, to);

    const dre = calculateDre({
      grossRevenue: summary.grossRevenue,
      discountsAndReturns: summary.discountsAndReturns,
      cmv: summary.cmv,
      paymentFees: summary.paymentFees,
      expenses,
    });

    return {
      period: { from, to },
      grossRevenue: dre.grossRevenue.toString(),
      discountsAndReturns: dre.discountsAndReturns.toString(),
      netRevenue: dre.netRevenue.toString(),
      cmv: dre.cmv.toString(),
      grossProfit: dre.grossProfit.toString(),
      paymentFees: dre.paymentFees.toString(),
      expenses: dre.expenses.toString(),
      netProfit: dre.netProfit.toString(),
    };
  }

  // RN 10.18: filtros reproduzíveis, relatório sempre exibe período e
  // critérios usados. Sem filtro de status explícito, considera só vendas
  // que compõem faturamento (mesma regra do dashboard).
  async getSalesReport(
    companyId: string,
    from: Date,
    to: Date,
    channel?: SalesChannel,
    status?: SaleStatus,
  ) {
    const where: Prisma.SaleWhereInput = {
      companyId,
      createdAt: { gte: from, lte: to },
      ...(channel ? { channel } : {}),
      ...(status ? { status } : { status: { in: COUNTED_SALE_STATUSES } }),
    };

    const [sales, totals] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: { customer: true, items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.aggregate({
        where,
        _sum: {
          subtotal: true,
          total: true,
          cmvCalculated: true,
          grossProfitCalculated: true,
        },
        _count: { _all: true },
      }),
    ]);

    return {
      period: { from, to },
      filters: { channel: channel ?? null, status: status ?? null },
      totals: {
        grossRevenue: new Prisma.Decimal(totals._sum.subtotal ?? 0).toString(),
        netRevenue: new Prisma.Decimal(totals._sum.total ?? 0).toString(),
        cmv: new Prisma.Decimal(totals._sum.cmvCalculated ?? 0).toString(),
        grossProfit: new Prisma.Decimal(
          totals._sum.grossProfitCalculated ?? 0,
        ).toString(),
        salesCount: totals._count._all,
      },
      sales,
    };
  }

  // Produtos mais vendidos/mais lucrativos (§10.17/§10.18) — líquido de
  // devoluções (mesma lógica de calculateCmvAndProfit em Sales).
  async getTopProducts(
    companyId: string,
    from: Date,
    to: Date,
    limit: number,
    orderBy: 'quantity' | 'profit',
  ) {
    const items = await this.prisma.saleItem.findMany({
      where: {
        companyId,
        sale: {
          status: { in: COUNTED_SALE_STATUSES },
          createdAt: { gte: from, lte: to },
        },
      },
      include: { productVariant: { include: { product: true } } },
    });

    const byProduct = new Map<
      string,
      {
        productId: string;
        sku: string;
        name: string;
        quantity: Prisma.Decimal;
        revenue: Prisma.Decimal;
        cmv: Prisma.Decimal;
      }
    >();
    for (const item of items) {
      const product = item.productVariant.product;
      const remaining = new Prisma.Decimal(item.quantity).sub(
        item.quantityReturned,
      );
      if (remaining.lessThanOrEqualTo(0)) continue;

      const revenue = remaining.mul(item.unitPrice);
      const cmv = remaining.mul(item.unitCostAtSale ?? 0);
      const existing = byProduct.get(product.id) ?? {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: new Prisma.Decimal(0),
        revenue: new Prisma.Decimal(0),
        cmv: new Prisma.Decimal(0),
      };
      existing.quantity = existing.quantity.add(remaining);
      existing.revenue = existing.revenue.add(revenue);
      existing.cmv = existing.cmv.add(cmv);
      byProduct.set(product.id, existing);
    }

    const list = Array.from(byProduct.values())
      .sort((a, b) => {
        const aValue = orderBy === 'profit' ? a.revenue.sub(a.cmv) : a.quantity;
        const bValue = orderBy === 'profit' ? b.revenue.sub(b.cmv) : b.quantity;
        return bValue.sub(aValue).toNumber();
      })
      .slice(0, limit)
      .map((p) => ({
        productId: p.productId,
        sku: p.sku,
        name: p.name,
        quantitySold: p.quantity.toString(),
        revenue: p.revenue.toString(),
        profit: p.revenue.sub(p.cmv).toString(),
      }));

    return { period: { from, to }, orderBy, products: list };
  }

  // Valor de estoque atual, por produto e total (RN 11.10: quantidade x
  // custo médio atual).
  async getInventoryValueReport(companyId: string) {
    const balances = await this.prisma.stockBalance.findMany({
      where: { companyId },
      include: {
        productVariant: {
          include: {
            product: {
              include: {
                prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
    });

    const products = balances.map((balance) => {
      const product = balance.productVariant.product;
      const unitCost = new Prisma.Decimal(product.prices[0]?.costPrice ?? 0);
      const value = new Prisma.Decimal(balance.quantityAvailable).mul(unitCost);
      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantityAvailable: balance.quantityAvailable.toString(),
        unitCost: unitCost.toString(),
        value: value.toString(),
      };
    });

    const total = products.reduce(
      (sum, p) => sum.add(new Prisma.Decimal(p.value)),
      new Prisma.Decimal(0),
    );

    return { total: total.toString(), products };
  }

  private async getSalesSummary(companyId: string, from: Date, to: Date) {
    const [salesAgg, feesAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          companyId,
          status: { in: COUNTED_SALE_STATUSES },
          createdAt: { gte: from, lte: to },
        },
        _sum: {
          subtotal: true,
          discount: true,
          total: true,
          cmvCalculated: true,
          grossProfitCalculated: true,
        },
        _count: { _all: true },
      }),
      this.prisma.salePayment.aggregate({
        where: {
          companyId,
          sale: { status: { in: COUNTED_SALE_STATUSES } },
          createdAt: { gte: from, lte: to },
        },
        _sum: { feeAmount: true },
      }),
    ]);

    const grossRevenue = new Prisma.Decimal(salesAgg._sum.subtotal ?? 0);
    const netRevenue = new Prisma.Decimal(salesAgg._sum.total ?? 0);
    return {
      grossRevenue,
      netRevenue,
      discountsAndReturns: grossRevenue.sub(netRevenue),
      cmv: new Prisma.Decimal(salesAgg._sum.cmvCalculated ?? 0),
      grossProfit: new Prisma.Decimal(salesAgg._sum.grossProfitCalculated ?? 0),
      paymentFees: new Prisma.Decimal(feesAgg._sum.feeAmount ?? 0),
      salesCount: salesAgg._count._all,
    };
  }

  private async getRealizedExpenses(companyId: string, from: Date, to: Date) {
    const result = await this.prisma.expense.aggregate({
      where: { companyId, status: 'paid', paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return new Prisma.Decimal(result._sum.amount ?? 0);
  }

  private async getInventorySummary(companyId: string) {
    const balances = await this.prisma.stockBalance.findMany({
      where: { companyId },
      include: {
        productVariant: {
          include: {
            product: {
              include: {
                prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
    });

    return balances.reduce((sum, balance) => {
      const costPrice =
        balance.productVariant.product.prices[0]?.costPrice ?? 0;
      return sum.add(
        new Prisma.Decimal(balance.quantityAvailable).mul(costPrice),
      );
    }, new Prisma.Decimal(0));
  }

  private async getConsolidatedCashBalance(companyId: string) {
    const result = await this.prisma.financialTransaction.aggregate({
      where: { companyId },
      _sum: { amount: true },
    });
    return new Prisma.Decimal(result._sum.amount ?? 0);
  }

  // Soma (amountOriginal - amountReceived) de Receivable em aberto — sem
  // agregação nativa de subtração no Prisma, então soma em memória (volume
  // esperado é baixo, mesmo padrão de escala do resto do projeto).
  private async getReceivablesOpenBalance(companyId: string) {
    const rows = await this.prisma.receivable.findMany({
      where: { companyId, status: { in: ['pending', 'partially_received'] } },
      select: { amountOriginal: true, amountReceived: true },
    });
    return rows.reduce(
      (sum, row) =>
        sum.add(new Prisma.Decimal(row.amountOriginal).sub(row.amountReceived)),
      new Prisma.Decimal(0),
    );
  }

  private async getPayablesOpenBalance(companyId: string) {
    const rows = await this.prisma.payable.findMany({
      where: { companyId, status: { in: ['pending', 'partially_paid'] } },
      select: { amountOriginal: true, amountPaid: true },
    });
    return rows.reduce(
      (sum, row) =>
        sum.add(new Prisma.Decimal(row.amountOriginal).sub(row.amountPaid)),
      new Prisma.Decimal(0),
    );
  }
}

import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { AuditService } from '../../audit/audit.service';
import { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';

// Vendas que têm recibo (BR §10.10, regra 26): confirmadas, inclusive as que
// depois foram devolvidas ou canceladas — o recibo mostra o estado.
const RECEIPT_STATUSES: SaleStatus[] = [
  'confirmed',
  'partially_returned',
  'returned',
  'cancelled',
];

/** 32 bytes aleatórios em base64url: impossível de adivinhar. */
export const newReceiptToken = () => randomBytes(32).toString('base64url');

const notFound = () =>
  new AppError(
    'RECEIPT_NOT_FOUND',
    'Recibo não encontrado.',
    HttpStatus.NOT_FOUND,
  );

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Cria o link do recibo dentro da transação da confirmação da venda. */
  createLink(
    tx: Prisma.TransactionClient,
    params: { companyId: string; saleId: string; userId?: string },
  ) {
    return tx.saleReceiptLink.create({
      data: {
        companyId: params.companyId,
        saleId: params.saleId,
        token: newReceiptToken(),
        createdBy: params.userId,
      },
    });
  }

  /**
   * Link ativo da venda (cria se a venda é anterior ao recibo). Com
   * `rotate`, invalida o link atual e cria outro — para quando foi enviado à
   * pessoa errada.
   */
  async ensureLink(
    tenant: CurrentTenantContext,
    saleId: string,
    rotate: boolean,
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, companyId: tenant.companyId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!sale)
      throw new AppError(
        'SALE_NOT_FOUND',
        'Venda não encontrada.',
        HttpStatus.NOT_FOUND,
      );
    if (!RECEIPT_STATUSES.includes(sale.status))
      throw new AppError(
        'RECEIPT_NOT_AVAILABLE',
        'O recibo fica disponível depois que a venda é confirmada.',
        HttpStatus.CONFLICT,
        'status',
      );
    return this.prisma.$transaction(async (tx) => {
      const active = await tx.saleReceiptLink.findFirst({
        where: { companyId: tenant.companyId, saleId, revokedAt: null },
      });
      if (active && !rotate) return { token: active.token };
      if (active)
        await tx.saleReceiptLink.update({
          where: { id: active.id },
          data: { revokedAt: new Date() },
        });
      const link = await this.createLink(tx, {
        companyId: tenant.companyId,
        saleId,
        userId: tenant.userId,
      });
      if (rotate)
        await this.audit.record(tx, {
          companyId: tenant.companyId,
          userId: tenant.userId,
          action: 'sale.receipt_link_rotated',
          entityType: 'sale',
          entityId: saleId,
        });
      return { token: link.token };
    });
  }

  /**
   * Recibo público pelo token (sem login). O token resolve a empresa fora do
   * RLS (como convites); os dados são lidos dentro da transação com RLS da
   * empresa e passam por uma lista fechada de campos — nunca custo, lucro ou
   * dados internos.
   */
  async publicReceipt(token: string) {
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) throw notFound();
    const link = await this.prisma.saleReceiptLink.findUnique({
      where: { token },
      select: { companyId: true, saleId: true, revokedAt: true },
    });
    if (!link || link.revokedAt) throw notFound();

    return this.prisma.withTenant(link.companyId, async () => {
      const sale = await this.prisma.sale.findFirst({
        where: { id: link.saleId, companyId: link.companyId, deletedAt: null },
        include: {
          company: { select: { name: true, document: true } },
          customer: { select: { name: true } },
          items: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            include: {
              productVariant: {
                select: { product: { select: { name: true } } },
              },
            },
          },
          payments: {
            orderBy: { createdAt: 'asc' },
            include: { paymentMethod: { select: { name: true } } },
          },
          receivables: {
            where: { deletedAt: null, status: { not: 'cancelled' } },
            orderBy: [{ installmentNumber: 'asc' }, { dueDate: 'asc' }],
          },
        },
      });
      if (!sale || !RECEIPT_STATUSES.includes(sale.status)) throw notFound();

      const money = (value: Prisma.Decimal.Value) =>
        new Prisma.Decimal(value).toFixed(2);
      return {
        store: { name: sale.company.name, document: sale.company.document },
        number: sale.id.slice(0, 8).toUpperCase(),
        date: sale.createdAt,
        status: sale.status,
        customerName: sale.customer?.name ?? null,
        items: sale.items.map((item) => {
          const quantity = new Prisma.Decimal(item.quantity);
          return {
            name: item.productVariant.product.name,
            quantity: quantity.toString(),
            quantityReturned: new Prisma.Decimal(
              item.quantityReturned,
            ).toString(),
            unitPrice: money(item.unitPrice),
            discount: money(item.discount),
            total: money(quantity.mul(item.unitPrice).sub(item.discount)),
            isGift: item.isGift,
          };
        }),
        subtotal: money(sale.subtotal),
        discount: money(sale.discount),
        total: money(sale.total),
        payments: sale.payments.map((payment) => ({
          method: payment.paymentMethod.name,
          amount: money(payment.amount),
        })),
        installments: sale.receivables.map((receivable) => ({
          number: receivable.installmentNumber,
          dueDate: receivable.dueDate,
          amount: money(receivable.amountOriginal),
          paid: money(receivable.amountReceived),
          status: receivable.status,
        })),
      };
    });
  }
}

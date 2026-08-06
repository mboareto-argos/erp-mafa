import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppError } from '../../../common/errors/app-error';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { CurrentTenantContext } from '../../tenancy/jwt-payload.interface';
import type { CreateInventoryCountDto } from './dto/create-inventory-count.schema';
import type { UpdateInventoryCountDto } from './dto/update-inventory-count.schema';

const include = { items: { where: { deletedAt: null }, include: { productVariant: { include: { product: true, stockBalances: true } } }, orderBy: { productVariant: { product: { name: 'asc' as const } } } } };

@Injectable()
export class InventoryCountsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}
  list(companyId: string) { return this.prisma.inventoryCount.findMany({ where: { companyId, deletedAt: null }, include, orderBy: { createdAt: 'desc' } }); }
  async get(companyId: string, id: string) { const count = await this.prisma.inventoryCount.findFirst({ where: { id, companyId, deletedAt: null }, include }); if (!count) throw new AppError('INVENTORY_COUNT_NOT_FOUND', 'Inventário não encontrado.', HttpStatus.NOT_FOUND); return count; }
  async create(tenant: CurrentTenantContext, dto: CreateInventoryCountDto) {
    const variants = await this.prisma.productVariant.findMany({ where: { companyId: tenant.companyId, deletedAt: null, product: { status: 'active', deletedAt: null } }, include: { stockBalances: true } });
    if (!variants.length) throw new AppError('INVENTORY_COUNT_EMPTY', 'Cadastre produtos antes de iniciar um inventário.', HttpStatus.CONFLICT);
    return this.prisma.$transaction(async tx => { const count = await tx.inventoryCount.create({ data: { companyId: tenant.companyId, notes: dto.notes, createdBy: tenant.userId, items: { create: variants.map(variant => ({ companyId: tenant.companyId, productVariantId: variant.id, expectedQuantity: variant.stockBalances[0]?.quantityAvailable ?? 0, createdBy: tenant.userId })) } }, include }); await this.audit.record(tx, { companyId: tenant.companyId, userId: tenant.userId, action: 'inventory.started', entityType: 'inventory_count', entityId: count.id, afterData: { itemCount: variants.length } }); return count; });
  }
  async update(tenant: CurrentTenantContext, id: string, dto: UpdateInventoryCountDto) {
    const count = await this.get(tenant.companyId, id); if (count.status !== 'draft') throw new AppError('INVENTORY_COUNT_CLOSED', 'Este inventário já foi concluído.', HttpStatus.CONFLICT);
    const valid = new Set(count.items.map(item => item.id)); if (dto.items.some(item => !valid.has(item.itemId))) throw new AppError('INVALID_INVENTORY_ITEM', 'Um ou mais itens não pertencem ao inventário.', HttpStatus.BAD_REQUEST, 'items');
    return this.prisma.$transaction(async tx => { for (const item of dto.items) await tx.inventoryCountItem.update({ where: { id: item.itemId }, data: { countedQuantity: item.countedQuantity, countedBy: tenant.userId, countedAt: new Date() } }); return tx.inventoryCount.findUniqueOrThrow({ where: { id }, include }); });
  }
  async complete(tenant: CurrentTenantContext, id: string) {
    const count = await this.get(tenant.companyId, id); if (count.status !== 'draft') throw new AppError('INVENTORY_COUNT_CLOSED', 'Este inventário já foi concluído.', HttpStatus.CONFLICT); if (count.items.some(item => item.countedQuantity === null)) throw new AppError('INVENTORY_COUNT_INCOMPLETE', 'Conte todos os produtos antes de concluir.', HttpStatus.CONFLICT);
    return this.prisma.$transaction(async tx => {
      for (const item of count.items) { const balance = await tx.stockBalance.findUnique({ where: { companyId_productVariantId: { companyId: tenant.companyId, productVariantId: item.productVariantId } } }); const current = new Prisma.Decimal(balance?.quantityAvailable ?? 0); const delta = new Prisma.Decimal(item.countedQuantity!).sub(current); if (delta.isZero()) continue; const adjustmentId = randomUUID(); const movement = await tx.stockMovement.create({ data: { companyId: tenant.companyId, productVariantId: item.productVariantId, type: 'adjustment', quantity: delta, originType: 'adjustment', originId: adjustmentId, createdBy: tenant.userId } }); await tx.stockAdjustment.create({ data: { id: adjustmentId, companyId: tenant.companyId, productVariantId: item.productVariantId, stockMovementId: movement.id, reason: `Inventário #${id.slice(0, 8)}`, requiresApproval: false, approvedBy: tenant.userId, createdBy: tenant.userId } }); await tx.stockBalance.upsert({ where: { companyId_productVariantId: { companyId: tenant.companyId, productVariantId: item.productVariantId } }, create: { companyId: tenant.companyId, productVariantId: item.productVariantId, quantityAvailable: item.countedQuantity! }, update: { quantityAvailable: item.countedQuantity! } }); }
      const completed = await tx.inventoryCount.update({ where: { id }, data: { status: 'completed', completedAt: new Date(), completedBy: tenant.userId }, include }); await this.audit.record(tx, { companyId: tenant.companyId, userId: tenant.userId, action: 'inventory.completed', entityType: 'inventory_count', entityId: id, afterData: { adjustedItems: count.items.filter(item => !new Prisma.Decimal(item.expectedQuantity).equals(item.countedQuantity!)).length } }); return completed;
    });
  }
}

import { PrismaClient, RoleName } from '@prisma/client';

// Papeis fixos do sistema (docs/architecture/overview.md, secao 9.2). O
// vocabulario de permissoes cresce junto com cada modulo implementado —
// hoje so cobre o que Catalog (Fase 1) e as regras nomeadas em §9.2
// (view_cost, view_profit, manage_expenses, adjust_stock) precisam.
const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  owner: [
    'manage_catalog',
    'view_catalog',
    'view_cost',
    'view_profit',
    'manage_expenses',
    'adjust_stock',
  ],
  admin: [
    'manage_catalog',
    'view_catalog',
    'view_cost',
    'view_profit',
    'manage_expenses',
    'adjust_stock',
  ],
  // Vendedor: sem view_cost/view_profit/manage_expenses (§9.2).
  sales: ['view_catalog'],
  // Estoquista: sem permissoes financeiras (§9.2).
  inventory: ['view_catalog', 'adjust_stock'],
  // Financeiro: sem manage_catalog alem de leitura (§9.2).
  finance: ['view_catalog', 'view_cost', 'view_profit', 'manage_expenses'],
  // Visualizador: somente leitura (§9.2 — réplica read-only simplificada).
  viewer: ['view_catalog'],
};

const prisma = new PrismaClient();

async function main() {
  for (const [name, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await prisma.role.upsert({
      where: { name: name as RoleName },
      update: { permissions },
      create: { name: name as RoleName, permissions },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

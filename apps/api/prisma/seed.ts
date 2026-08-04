import { PrismaClient, RoleName } from '@prisma/client';

// Papeis fixos do sistema (docs/architecture/overview.md, secao 9.2). O
// vocabulario de permissoes cresce junto com cada modulo implementado —
// hoje cobre Catalog (Fase 1) + Inventory/Purchasing (Fase 2) +
// Sales/Customers/Payments (Fase 3).
const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  owner: [
    'manage_catalog',
    'view_catalog',
    'view_cost',
    'view_profit',
    'manage_expenses',
    'view_inventory',
    'adjust_stock',
    'manage_purchasing',
    'view_purchasing',
    'manage_sales',
    'view_sales',
    'manage_customers',
    'view_customers',
    'manage_payment_methods',
    'view_payment_methods',
  ],
  admin: [
    'manage_catalog',
    'view_catalog',
    'view_cost',
    'view_profit',
    'manage_expenses',
    'view_inventory',
    'adjust_stock',
    'manage_purchasing',
    'view_purchasing',
    'manage_sales',
    'view_sales',
    'manage_customers',
    'view_customers',
    'manage_payment_methods',
    'view_payment_methods',
  ],
  // Vendedor: sem view_cost/view_profit/manage_expenses (§9.2); consulta
  // disponibilidade de estoque (§9.3), sem acesso a compras. Registra
  // vendas e clientes, escolhe forma de pagamento existente mas não
  // configura taxas (§9.3: "registrar vendas", "cadastrar clientes
  // conforme permissão").
  sales: [
    'view_catalog',
    'view_inventory',
    'manage_sales',
    'view_sales',
    'manage_customers',
    'view_customers',
    'view_payment_methods',
  ],
  // Estoquista: sem permissoes financeiras; registra recebimentos e consulta
  // compras (§9.4), ajusta estoque mediante autorizacao (permissao
  // adjust_stock — sem fila de aprovacao real ainda, ver StockAdjustment).
  inventory: ['view_catalog', 'view_inventory', 'adjust_stock', 'manage_purchasing', 'view_purchasing'],
  // Financeiro: sem manage_catalog alem de leitura; consulta compras para
  // contexto de contas a pagar (Payables, Fase 4), sem gerenciar compras.
  // Configura formas de pagamento (taxas) — natural do papel financeiro.
  finance: [
    'view_catalog',
    'view_cost',
    'view_profit',
    'manage_expenses',
    'view_inventory',
    'view_purchasing',
    'view_sales',
    'view_customers',
    'manage_payment_methods',
    'view_payment_methods',
  ],
  // Visualizador: somente leitura (§9.2 — réplica read-only simplificada).
  viewer: [
    'view_catalog',
    'view_inventory',
    'view_purchasing',
    'view_sales',
    'view_customers',
    'view_payment_methods',
  ],
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

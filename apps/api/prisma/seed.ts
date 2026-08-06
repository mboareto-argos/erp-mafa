import { PrismaClient, RoleName } from '@prisma/client';

// Papeis fixos do sistema (docs/architecture/overview.md, secao 9.2). O
// vocabulario de permissoes cresce junto com cada modulo implementado —
// hoje cobre Catalog (Fase 1) + Inventory/Purchasing (Fase 2) +
// Sales/Customers/Payments (Fase 3) + Financeiro (Fase 4) + Reporting (Fase 5).
const FINANCE_PERMISSIONS = [
  'manage_expenses', // ja existia desde a Fase 1, so' ganha endpoint real agora
  'view_expenses',
  'manage_financial_accounts',
  'view_financial_accounts',
  'view_cash_flow',
  'manage_receivables',
  'view_receivables',
  'manage_payables',
  'view_payables',
];

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  owner: [
    'view_dashboard',
    'manage_catalog',
    'view_catalog',
    'view_cost',
    'view_profit',
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
    ...FINANCE_PERMISSIONS,
    'view_reports',
    // BR §9.1 — "consultar auditoria" é uma permissão exclusiva do
    // proprietário, não listada para os demais perfis (§9.2-9.6).
    'view_audit',
    // BR §10.19 (Fase 6) — importação é dado sensível de migração; mesmo
    // nível de exclusividade de "exportar dados"/"configurar integrações"
    // do proprietário (§9.1).
    'manage_imports',
    'view_company_settings',
    'manage_company_settings',
    'manage_users',
  ],
  admin: [
    'view_dashboard',
    'manage_catalog',
    'view_catalog',
    'view_cost',
    'view_profit',
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
    ...FINANCE_PERMISSIONS,
    'view_reports',
    'manage_imports',
    'view_company_settings',
    'manage_users',
  ],
  // Vendedor: sem view_cost/view_profit/manage_expenses (§9.2); consulta
  // disponibilidade de estoque (§9.3), sem acesso a compras. Registra
  // vendas e clientes, escolhe forma de pagamento existente mas não
  // configura taxas (§9.3: "registrar vendas", "cadastrar clientes
  // conforme permissão"). Sem acesso financeiro (contas/receivables/
  // payables/despesas).
  sales: [
    'view_dashboard',
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
  inventory: ['view_dashboard', 'view_catalog', 'view_inventory', 'adjust_stock', 'manage_purchasing', 'view_purchasing'],
  // Financeiro: sem manage_catalog alem de leitura; consulta compras para
  // contexto de contas a pagar, sem gerenciar compras. Configura formas de
  // pagamento (taxas) e todo o modulo financeiro — natural do papel (§9.5).
  finance: [
    'view_dashboard',
    'view_catalog',
    'view_cost',
    'view_profit',
    'view_inventory',
    'view_purchasing',
    'view_sales',
    'view_customers',
    'manage_payment_methods',
    'view_payment_methods',
    ...FINANCE_PERMISSIONS,
    'view_reports',
  ],
  // Visualizador: somente leitura (§9.2 — réplica read-only simplificada).
  viewer: [
    'view_dashboard',
    'view_catalog',
    'view_inventory',
    'view_purchasing',
    'view_sales',
    'view_customers',
    'view_payment_methods',
    'view_expenses',
    'view_financial_accounts',
    'view_cash_flow',
    'view_receivables',
    'view_payables',
    'view_reports',
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

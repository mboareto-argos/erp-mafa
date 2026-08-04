# apps/api

API do ERP (Nest.js + TypeScript + Prisma), organizada em módulos de domínio conforme
docs/architecture/overview.md, seção 5 (Identity, Tenancy, Catalog, Inventory, Purchasing,
Sales, Customers, Suppliers, Payments, Receivables, Payables, CashFlow, Reporting,
Notifications, Imports, Audit).

Ainda não scaffoldado. Sugestão de setup:
\`\`\`
pnpm dlx @nestjs/cli new . --package-manager pnpm
pnpm add prisma @prisma/client && pnpm dlx prisma init
\`\`\`

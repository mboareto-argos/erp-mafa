# Dicionário de dados

> Este arquivo deve ser completado com o schema final (todas as ~45 entidades da seção 17 do
> Documento de Negócio / seção 6 de docs/architecture/overview.md) conforme cada módulo for
> implementado. O DDL ilustrativo inicial (núcleo de vendas e estoque) está em
> docs/architecture/overview.md, seção 7.2.

## Como manter este arquivo
- Toda migration do Prisma que criar ou alterar uma tabela deve atualizar a entrada
  correspondente aqui (nome da tabela, colunas, tipos, constraints, índices).
- Toda tabela operacional segue a regra TA-DATA-001 (campos de auditoria + `company_id`
  obrigatórios) — não repetir isso em cada entrada, só referenciar a regra.

## Módulos já documentados no nível conceitual (aguardando DDL completo)
- [ ] Identity / Tenancy
- [ ] Catalog
- [ ] Inventory
- [ ] Purchasing
- [ ] Sales
- [ ] Customers / Suppliers
- [ ] Payments / Receivables / Payables / CashFlow
- [ ] Reporting / Notifications / Imports / Audit

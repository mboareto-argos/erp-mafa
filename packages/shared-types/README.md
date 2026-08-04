# @erp-mafa/shared-types

Tipos TypeScript compartilhados entre apps/api e apps/web: DTOs de request/response,
enums de status (SaleStatus, ReceivableStatus etc.), conforme o modelo de domínio em
docs/architecture/overview.md, seção 6.

Regra TA-DOMAIN-001: valores monetários usam um tipo Decimal (ex.: decimal.js), nunca number
puro, para não reintroduzir erro de ponto flutuante no lado do TypeScript.

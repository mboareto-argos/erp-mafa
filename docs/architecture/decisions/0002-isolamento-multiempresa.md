# ADR-0002 — Estratégia de isolamento multiempresa

## Status
Aceito

## Contexto
O produto precisa nascer pronto para multiempresa (SaaS) mesmo atendendo só a MAFA Store
no início (seção 6.3 / Fase 7 do roadmap em business-requirements.md).

## Decisão
Banco de dados compartilhado, schema compartilhado, isolamento por coluna `company_id`
em toda tabela operacional, reforçado por Row-Level Security no PostgreSQL.
Detalhes completos em docs/architecture/overview.md, seções 7 e 8.

## Consequências
- Onboarding de uma nova empresa não exige provisionamento de infraestrutura.
- Toda query e todo teste de módulo crítico precisam considerar o cenário multiempresa
  (regra TA-TENANT-004).
- Uma empresa específica pode ser migrada para banco dedicado no futuro sem redesenho,
  caso um contrato exija isolamento físico.

## Alternativas consideradas
- Banco por empresa: descartado por custo operacional no estágio atual.
- Schema por empresa: descartado — complexidade de migrations/connection pooling sem
  ganho de isolamento relevante frente ao RLS.

# Estratégia de testes

> Extraído/expandido da seção 11 de docs/architecture/overview.md.

| Nível | O que cobre | Ferramenta sugerida |
|---|---|---|
| Unitário | Regras de cálculo puras (CMV, rateio de custo, cálculo de parcelas, margem) | Vitest/Jest |
| Integração de módulo | Casos de uso completos de um módulo contra banco real | Jest + banco de teste (container Postgres) |
| Contrato de API | Cada endpoint contra o schema definido em docs/api/openapi.yaml | Supertest |
| Multiempresa (obrigatório) | Cenário de duas empresas por módulo crítico (regra TA-TENANT-004) | Igual ao de integração |
| Ponta a ponta (E2E) | Fluxos críticos da seção 19 do Documento de Negócio | Playwright |
| Migração / importação | Conciliação de planilhas importadas (critérios da seção 34.8) | Fixtures reais anonimizadas da MAFA Store |

Regras associadas: TA-TEST-001, TA-TEST-002 em docs/architecture/overview.md, seção 11.

## Checklist de pronto por endpoint
Ver docs/architecture/overview.md, seção 14.

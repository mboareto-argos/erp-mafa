# ERP MAFA Store

ERP simplificado, piloto na **MAFA Store**, com fundação já pensada para evoluir para uma
plataforma multiempresa (SaaS) para pequenos vendedores.

Este repositório contém a fundação do projeto: a API Nest.js/Prisma já cobre as Fases 1–5
do roadmap, e a web Next.js está sendo construída sobre o Design System e os wireframes.

## Comece por aqui

| Documento | O que é |
|---|---|
| [`docs/product/business-requirements.md`](docs/product/business-requirements.md) | Documento de Negócio completo — visão, módulos, regras, personas, roadmap |
| [`docs/product/design-system.md`](docs/product/design-system.md) | Design System — tokens, componentes, padrões de tela, acessibilidade |
| [`docs/product/wireframes/wireframes.html`](docs/product/wireframes/wireframes.html) | Protótipo navegável (abrir no navegador) — norte visual do web app |
| [`docs/architecture/overview.md`](docs/architecture/overview.md) | Documentação técnica — stack, arquitetura, modelo de domínio/dados, segurança, testes |
| [`AGENTS.md`](AGENTS.md) | Regras críticas e convenções para quem (humano ou agente de IA) for implementar |

## Estrutura

```
apps/           web (Next.js) e api (Nest.js)
packages/       tokens de design, tipos compartilhados, UI compartilhada, config
docs/           toda a documentação de produto, arquitetura, API, dados, testes e operação
```

Estrutura completa e justificativa em `docs/architecture/overview.md`, seção 4.

## Stack

Turborepo · Next.js · Tailwind · shadcn/ui · Nest.js · PostgreSQL · Prisma
— decisão registrada em [`docs/architecture/decisions/0001-stack-inicial.md`](docs/architecture/decisions/0001-stack-inicial.md).

## Ambiente de desenvolvimento

Projeto pensado para desenvolvimento com apoio de agentes de IA no [Zed](https://zed.dev).
Leia `AGENTS.md` antes de começar qualquer implementação — ele resume as regras de negócio
e técnicas que nunca podem ser violadas.

## Estado atual e próximos passos

1. API: Fases 1–5 implementadas (fundação, estoque/compras, vendas, financeiro e reporting),
   mais auditoria (escrita + consulta) e idempotência (TA-API-002) nos comandos críticos —
   ajuste de estoque, recebimento de compra, confirmação de venda, pagamento/cancelamento de
   contas a receber/pagar e transferências entre contas.
2. RLS no PostgreSQL (TA-DATA-005): segunda camada de isolamento multiempresa direto no banco,
   independente do filtro por `company_id` na aplicação — ver `docs/operations/runbook.md`.
3. Web: as telas de início, produtos, estoque, compras, fornecedores, vendas, financeiro,
   clientes, importações e configurações existem com dados reais, sessão via cookies httpOnly e permissões
   aplicadas — construídas sobre o Design System (tokens Tailwind derivados de
   `packages/design-tokens/tokens.json`, fontes vendorizadas localmente para build
   reproduzível). Produtos, Fornecedores e Clientes têm CRUD completo (edição, reativação,
   busca, paginação); Compras e Vendas usam um wizard multi-item (Itens → Custos/Pagamento →
   Confirmar).
   Vendas a prazo, compras e despesas parceladas geram automaticamente contas a
   receber/pagar. Estoque inclui inventário físico, Vendas inclui devolução e Compras inclui
   estorno controlado de recebimento. Configurações administra categorias, marcas, empresa,
   equipe e política temporal de distribuição do lucro.
4. Fase 6: importação e conciliação (BR §10.19/§34.8) — `POST /imports/:entityType/preview`
   (dry-run) → `confirm` → `GET /imports/:id` (relatório com contagens e reconciliação) →
   `revert` (reversão soft, antes do aceite final). Cobre produtos (com alias, RN-IMP-001/002),
   estoque inicial, clientes, fornecedores, despesas, contas a pagar/receber — só CSV,
   processamento síncrono, com workspace Web de prévia, revisão, confirmação,
   relatório, conciliação e reversão controlada.

### Débito técnico conhecido

Registrado deliberadamente como pendência, não implementado ainda:

- **Auditoria ainda não cobre todos os eventos** (BR §10.23): cobre hoje ajuste de estoque,
  recebimento de compra, confirmação de venda, pagamento/cancelamento de contas a
  receber/pagar, transferências, reprecificação de produto e confirmação/reversão de
  importação — faltam login, edição cadastral de produto, desconto, mudança de vencimento,
  export e alguns estornos financeiros excepcionais. Criação/convite de usuário, mudança de
  permissão e configurações da empresa já são auditadas. Consulta já existe (`GET /audit`,
  permissão `view_audit`).
- **Importação (Fase 6) cobre só cadastros + saldos em aberto**: compras e vendas históricas
  ficam de fora (já opcionais na própria BR); sem UI de mapeamento de colunas livre (cabeçalho
  fixo por modelo baixável); casamento de duplicidade de produto é exato (SKU/nome/alias), sem
  fuzzy matching; processamento síncrono, sem fila (BullMQ/Redis previsto desde o stack
  inicial, nunca implementado — só relevante em volumes bem maiores que uma loja pequena);
  exportação (BR §10.20) não implementada.
- **Edição financeira ainda é restrita**: contas, formas de pagamento, despesas e vencimentos
  não possuem alteração auditada. Estoque e operações confirmadas continuam imutáveis por
  design; correções usam ajuste, devolução ou estorno rastreável.
- **Paginação/busca só em Produtos, Clientes e Fornecedores** — as listas de Compras, Vendas,
  Estoque e Financeiro continuam sem paginação (mitigado por filtro de período onde existe).
  `GET` desses três cadastros aceita array completo sem `page` por compatibilidade temporária
  com os seletores usados em Compras/Vendas/Estoque — remover esse modo legado exige revisar
  os três consumidores juntos, não isoladamente.
- **Sem testes automatizados no `apps/web`** — nenhum framework de teste (vitest/playwright)
  configurado ainda; toda a cobertura de teste do projeto está em `apps/api`.

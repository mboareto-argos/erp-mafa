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
3. Web: as 8 telas de negócio (início, produtos, estoque, compras, fornecedores, vendas,
   financeiro, clientes) existem com dados reais, sessão via cookies httpOnly e permissões
   aplicadas — construídas sobre o Design System (tokens Tailwind derivados de
   `packages/design-tokens/tokens.json`, fontes vendorizadas localmente para build
   reproduzível). Produtos, Fornecedores e Clientes têm CRUD completo (edição, reativação,
   busca, paginação); Compras e Vendas usam um wizard multi-item (Itens → Custos/Pagamento →
   Confirmar).
4. Fase 6: importação, conciliação e validação com a operação da MAFA Store.

### Débito técnico conhecido

Registrado deliberadamente como pendência, não implementado ainda:

- **Auditoria ainda não cobre todos os eventos** (BR §10.23): cobre hoje ajuste de estoque,
  recebimento de compra, confirmação de venda, pagamento/cancelamento de contas a
  receber/pagar, transferências e reprecificação de produto — faltam login, criação/edição de
  usuário, mudança de permissão, criação/edição de produto (campos cadastrais), desconto,
  mudança de vencimento, import/export, mudança de configuração e estorno. Consulta já existe
  (`GET /audit`, permissão `view_audit`).
- **CRUD só de criação em Estoque/Compras/Vendas/Financeiro** — por design nos dois primeiros
  (movimentação e venda/compra confirmadas são imutáveis, corrigir é lançar um novo
  ajuste/estorno, nunca editar); edição em Financeiro (contas, formas de pagamento, despesas)
  ainda não foi implementada.
- **Paginação/busca só em Produtos, Clientes e Fornecedores** — as listas de Compras, Vendas,
  Estoque e Financeiro continuam sem paginação (mitigado por filtro de período onde existe).
  `GET` desses três cadastros aceita array completo sem `page` por compatibilidade temporária
  com os seletores usados em Compras/Vendas/Estoque — remover esse modo legado exige revisar
  os três consumidores juntos, não isoladamente.
- **Sem testes automatizados no `apps/web`** — nenhum framework de teste (vitest/playwright)
  configurado ainda; toda a cobertura de teste do projeto está em `apps/api`.

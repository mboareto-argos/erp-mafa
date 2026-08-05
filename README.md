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
   mais auditoria (escrita + consulta) e idempotência (TA-API-002) nos comandos críticos.
2. Web: as 8 telas de negócio (início, produtos, estoque, compras, fornecedores, vendas,
   financeiro, clientes) existem com dados reais, sessão via cookies httpOnly e permissões
   aplicadas — construídas sobre o Design System (tokens Tailwind derivados de
   `packages/design-tokens/tokens.json`).
3. Fase 6: importação, conciliação e validação com a operação da MAFA Store.

### Débito técnico conhecido

Registrado deliberadamente como pendência, não implementado ainda:

- **Auditoria parcial** (BR §10.23): só 3 dos ~16 eventos recomendados são registrados hoje
  (`stock.adjusted`, `purchase.received`, `sale.confirmed`) — faltam login, criação/edição de
  usuário, mudança de permissão, criação/edição de produto, cancelamento de venda, alteração de
  preço, desconto, pagamento, mudança de vencimento, import/export, mudança de configuração,
  exclusão lógica e estorno. Consulta já existe (`GET /audit`, permissão `view_audit`).
- **CRUD só de criação no web**: nenhuma das 8 telas de negócio tem edição ou exclusão lógica
  ainda — só listar e criar.
- **Sem paginação/busca/filtro** nas listas do web (aceitável na escala atual, revisar quando o
  catálogo/base de clientes crescer).
- **Sem testes automatizados no `apps/web`** — nenhum framework de teste (vitest/playwright)
  configurado ainda; toda a cobertura de teste do projeto está em `apps/api`.
- **`quick-purchase-form` só aceita 1 item por compra** — inconsistente com o formulário de
  venda rápida, que já suporta múltiplas linhas.

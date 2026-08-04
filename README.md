# ERP MAFA Store

ERP simplificado, piloto na **MAFA Store**, com fundação já pensada para evoluir para uma
plataforma multiempresa (SaaS) para pequenos vendedores.

Este repositório é a **base do projeto**: ainda não tem `apps/web` e `apps/api` implementados,
mas já tem toda a documentação de fundação necessária para começar.

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
apps/           web (Next.js) e api (Nest.js) — a implementar
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

## Próximos passos sugeridos

1. `pnpm dlx create-turbo@latest` (ou configurar manualmente) para finalizar o scaffold do
   monorepo em cima da estrutura já existente.
2. Scaffold de `apps/web` (Next.js) e `apps/api` (Nest.js) — ver `README.md` de cada pasta.
3. Modelagem do schema Prisma a partir de `docs/architecture/overview.md`, seção 6 e 7.
4. Primeira fase do roadmap: Identity, Tenancy, Catalog (ver `docs/architecture/overview.md`,
   seção 15).

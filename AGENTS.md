# AGENTS.md — ERP MAFA Store

## Visão resumida
ERP simplificado, piloto na MAFA Store, evoluindo para SaaS multiempresa para pequenos vendedores.

- Fonte de verdade de **negócio**: `docs/product/business-requirements.md`
- Fonte de verdade **visual**: `docs/product/design-system.md` + `docs/product/wireframes/wireframes.html`
- Fonte de verdade **técnica**: `docs/architecture/overview.md`

Leia os três antes de implementar qualquer módulo. Em caso de dúvida sobre uma regra de
negócio, a fonte de negócio vence; em caso de dúvida sobre visual, a fonte visual vence;
em caso de dúvida sobre arquitetura/stack, a fonte técnica vence.

## Comandos do projeto
- `pnpm install` — instala dependências do monorepo
- `pnpm dev` — sobe web + api em modo desenvolvimento
- `pnpm test` — roda toda a suíte de testes
- `pnpm test:tenant` — roda especificamente os cenários multiempresa (regra TA-TENANT-004)
- `pnpm db:migrate` — aplica migrations do Prisma

## Estrutura de pastas
Ver `docs/architecture/overview.md`, seção 4.

## Regras de negócio críticas — nunca violar
1. Todo registro operacional pertence a uma `company_id` (regra de integridade nº 1 do
   Documento de Negócio).
2. Valores monetários usam `Decimal`/`numeric`, nunca `float`/`double` (regra TA-DOMAIN-001).
3. Custo é sempre calculado, nunca digitado diretamente pelo usuário (regra DS-FORM-004 do
   Design System).
4. Estoque é sempre derivado de movimentações, nunca editado direto (seção 34.3 do
   Documento de Negócio).
5. Cancelamento nunca apaga registro — sempre um novo estado (regra de integridade nº 9).
6. Toda ação sensível é autorizada no backend (regra TA-SEC-001) — nunca confiar só no
   frontend.
7. Elementos de UI sem permissão são **ocultados**, nunca mostrados desabilitados/bloqueados
   (regra DS-PERM-001 do Design System).

## Política multiempresa
Toda query, todo endpoint novo, todo teste de módulo crítico: ver `docs/architecture/overview.md`,
seção 8. Nunca aceitar `company_id` vindo do cliente sem cruzar com o `Membership` do usuário
autenticado (regra TA-TENANT-002).

## Convenções de teste
Ver `docs/testing/test-strategy.md`. Testes de cálculo financeiro devem usar os exemplos
numéricos já presentes no Documento de Negócio (seção 10.6, seção 11).

## Regras para migrations
Toda migration é versionada pelo Prisma, nunca uma alteração manual direto no banco.
Ao criar/alterar uma tabela, atualizar `docs/data/data-dictionary.md`.

## Regras de segurança
Ver `docs/architecture/overview.md`, seção 9. Nenhuma checagem de permissão só no frontend.

## Como executar validações
- Rodar `pnpm test` antes de considerar qualquer história pronta.
- Rodar `pnpm test:tenant` para qualquer módulo listado como crítico em
  `docs/architecture/overview.md`, seção 5.

## Arquivos que não podem ser alterados sem aprovação humana explícita
- `docs/product/business-requirements.md`
- `docs/product/design-system.md`
- `docs/architecture/decisions/*.md` (ADRs existentes — só criação de novos, nunca edição)

## Definição de pronto
Ver seção 30 do `docs/product/business-requirements.md` + `docs/architecture/overview.md`,
seção 14 (checklist técnico por endpoint/tela).

## Regra de conduta para agentes de IA
Se uma tarefa pedida conflitar com alguma regra deste arquivo ou dos documentos-fonte,
sinalize o conflito explicitamente antes de prosseguir — nunca resolva silenciosamente
assumindo um comportamento não documentado (Documento de Negócio, seção 15.3).

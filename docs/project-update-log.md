# Registro de Atualizações e Retomada

Este documento é o ponto de passagem operacional entre agentes que trabalham no
ERP MAFA Store. Ele não substitui os documentos-fonte do projeto:

- Regras de negócio: `docs/product/business-requirements.md`
- Arquitetura e segurança: `docs/architecture/overview.md`
- Design e interação: `docs/product/design-system.md` e
  `docs/product/wireframes/wireframes.html`

Antes de iniciar qualquer bloco, o agente deve ler este registro, `AGENTS.md` e
os documentos-fonte acima. Ao concluir um bloco, deve atualizar este arquivo na
mesma alteração, antes de considerar o trabalho pronto.

## Como registrar um bloco

Acrescente uma entrada em ordem cronológica inversa usando este formato:

```md
### Bloco N — Nome do bloco

- **Período:** AAAA-MM-DD a AAAA-MM-DD
- **Status:** concluído | em andamento | bloqueado
- **Objetivo:** resultado esperado do bloco.
- **Modificado:** arquivos, módulos, migrations e contratos alterados.
- **Motivo:** problema, requisito ou decisão que justificou a mudança.
- **Validação:** comandos executados e resultado; testes que ainda faltam.
- **Pendências / retomada:** próximo passo concreto, riscos e decisões pendentes.
```

Não registrar segredos, tokens de acesso ou dados reais de clientes. Para decisões
arquiteturais permanentes, criar um ADR novo em vez de alterar ADRs existentes.

## Plano aprovado

| Bloco | Escopo | Condição para avançar |
| --- | --- | --- |
| 1 | Finalizar e revisar CRUD de Produtos, Clientes e Fornecedores | Fluxos ponta a ponta, contratos/documentação atualizados e validações aprovadas |
| 2 | Padronizar listagens: busca, paginação, estados e responsividade | Componentes reutilizáveis aplicados aos cadastros-base |
| 3 | Confiabilidade do build e base visual por tokens | Build Turbopack reproduzível e sem valores visuais fora dos tokens |
| 4 | RLS e isolamento multiempresa no banco | Migration, contexto seguro e testes de tenant aprovados |
| 5 | Auditoria e idempotência de comandos críticos | Cobertura ampliada e consulta de auditoria funcional |
| 6 | Interfaces dos fluxos de estoque, compras, vendas, financeiro e relatórios | Cada domínio entregue com permissões, estados e testes aplicáveis |

## Estado inicial — 2026-08-05

### Bloco 8 — Fase 6: Importação e conciliação (migração da MAFA Store)

- **Período:** 2026-08-06
- **Status:** concluído (só API — sem tela no web ainda)
- **Objetivo:** implementar o escopo técnico exato de BR §10.19 (importação) e §34.8 (critérios
  de aceite de migração/conciliação), não uma interpretação livre — dry-run obrigatório, erro
  por linha/coluna, casamento de duplicidade de produto por alias (RN-IMP-001/002), estoque
  inicial gerando movimentação, idempotência, reversão antes do aceite final.
- **Modificado:** modelos `ImportJob`/`ImportRow` (schema.prisma + migration, com RLS aplicado
  explicitamente já que a migration de RLS anterior só cobriu tabelas pré-existentes);
  `apps/api/src/modules/imports/` (`imports.service.ts`, `imports.controller.ts`,
  `importers/` — um por tipo de entidade: product, initial_stock, customer, supplier, expense,
  payable, receivable — cada um reaproveitando o service/schema Zod de criação já existente do
  módulo correspondente); permissão `manage_imports` (owner/admin) no seed; `CustomersModule`,
  `PurchasingModule`, `ExpensesModule`, `PayablesModule`, `ReceivablesModule` passaram a
  exportar seus services (não exportavam antes, precisavam ser injetáveis no módulo de
  imports); correção de 4 erros de lint pré-existentes (não introduzidos por este bloco) em
  `prisma.service.ts` (tipagem do Proxy de RLS).
- **Motivo:** próximo item do roadmap de negócio (Fase 6) depois de fechar os cadastros-base,
  RLS e auditoria/idempotência ampliada.
- **Decisões de escopo tomadas com o usuário:** processamento síncrono (sem BullMQ/Redis, que
  nunca foi implementado apesar de decidido no stack da Fase 0); escopo de entidades limitado a
  cadastros + saldos em aberto (compras/vendas históricas ficam de fora, já opcionais na BR);
  só CSV (sem XLSX). Simplificações adicionais documentadas no README: sem UI de mapeamento de
  colunas livre (cabeçalho fixo por modelo baixável), casamento de duplicidade exato (sem fuzzy
  matching), reversão soft (nunca hard-delete, consistente com TA-DATA-001).
- **Detalhe técnico relevante:** cada linha da confirmação roda dentro de um `SAVEPOINT` da
  transação por-requisição (RLS/`TenantTransactionInterceptor`) — sem isso, um erro de banco
  numa linha abortaria a transação inteira do Postgres e reprovaria silenciosamente todas as
  linhas seguintes, violando a exigência de erro isolado por linha (RN 10.19.3).
- **Validação:** `pnpm test` (12 suítes, 44 testes, incluindo 13 novos testes unitários de
  imports), `pnpm test:integration` (14 suítes, 79 testes, incluindo 10 novos cobrindo preview→
  confirm, duplicidade de produto, estoque inicial, idempotência, reconciliação, revert,
  permissão e isolamento multiempresa), `pnpm test:tenant` (5 suítes, 13 testes), lint e
  `tsc --noEmit` limpos.
- **Pendências / retomada:** exportação (BR §10.20) não implementada; sem tela no web ainda
  (API-first, como em todas as fases anteriores); BullMQ/Redis continua pendente para volumes
  maiores; compras/vendas históricas via import ficam para um bloco futuro se o usuário pedir.

### Bloco 7 — Revisão dos Blocos 1-6 e correção de idempotência financeira

- **Período:** 2026-08-06
- **Status:** concluído
- **Objetivo:** revisar o trabalho registrado nos Blocos 1-6 (feito por outro agente
  enquanto este estava fora) antes de aceitar como base — mesma prática já usada
  neste projeto na revisão da Fase 5.5.
- **Modificado:** `apps/web/src/app/api/finance/[...path]/route.ts` passou a
  repassar o header `Idempotency-Key` da requisição recebida para a API Nest
  (antes era descartado silenciosamente); `apps/web/src/components/inventory/
  stock-adjustment-form.tsx` passou a gerar a `Idempotency-Key` uma vez por
  instância do formulário (`useState(() => crypto.randomUUID())`) em vez de uma
  chave nova a cada tentativa de envio; `globals.css` ganhou regras de cor para
  os status `draft`, `ordered`, `partially_returned`, `returned` e `scheduled`
  em `.status-badge` (e o token `--color-info-50`), que antes renderizavam sem
  cor por não terem regra correspondente.
- **Motivo:** o Bloco 6 registrava que a baixa de contas a receber/pagar reusava
  `Idempotency-Key` em reenvio — verdade no formulário, mas o proxy financeiro
  descartava o header antes de repassar à API, então a proteção contra
  duplicidade não funcionava de ponta a ponta nesse fluxo. O ajuste de estoque
  tinha o mesmo problema de raiz (chave nova a cada envio), embora não fosse uma
  alegação do log. As lacunas de cor eram um resíduo visual (rótulo de texto
  continuava presente, mas sem destaque de cor).
- **Validação:** revisão de código dirigida por área (RLS/prisma.service.ts/
  interceptor de tenant, CRUD de Products/Suppliers/Customers, idempotência
  financeira, Bloco 6 completo) mais execução direta — `pnpm --filter
  @erp-mafa/api test` (9 suítes, 31 testes), `pnpm --filter @erp-mafa/api
  test:integration` com RLS realmente ativo via papel `erp_mafa_app` sem
  `BYPASSRLS` (13 suítes, 69 testes), `pnpm --filter @erp-mafa/web lint` e
  `pnpm --filter @erp-mafa/web build` com Turbopack (sem erro de sandbox neste
  ambiente, confirmando que a estratégia de fontes locais do Bloco 3 resolveu o
  problema).
- **Pendências / retomada:** os Blocos 1-6 estão confirmados corretos e sólidos
  além dos dois problemas de idempotência corrigidos aqui — nenhuma outra
  reversão foi necessária. Débitos já conhecidos (RLS obrigatório — concluído
  no Bloco 4 —, cobertura parcial de auditoria, paginação legada compatível em
  Products/Suppliers/Customers) continuam válidos conforme registrado abaixo.
  Próximo passo: decidir com o usuário qual módulo de negócio ainda não
  implementado (Fase 6 do roadmap original — importação/conciliação) ou qual
  débito técnico atacar em seguida.

### Bloco 6 — Interfaces dos fluxos operacionais

- **Período:** 2026-08-05 a 2026-08-06
- **Status:** concluído
- **Objetivo:** tornar os fluxos de estoque, compras, vendas, financeiro e
  indicadores utilizáveis na web, mantendo os efeitos automáticos de cada
  operação visíveis, permissões coerentes e os estados obrigatórios de UI.
- **Modificado:** Estoque passou a exibir saldos derivados, alertas e histórico
  de movimentações; Compras agora usa o wizard Itens → Custos → Confirmar,
  aceita múltiplos itens, calcula o custo final com o rateio de frete e recebe
  todos os itens em uma única operação; Vendas agora usa o wizard Itens → Pagamento → Confirmar,
  preserva os dados ao voltar, mantém o total visível e detalha os efeitos sobre
  estoque e financeiro antes da confirmação. Financeiro foi organizado em seções de configuração, despesas e
  contas em aberto, com estados vazios orientados à próxima ação. Foram incluídos
  `loading.tsx` e `error.tsx` específicos para Financeiro, Início, Compras,
  Vendas e Estoque, reutilizando os componentes compartilhados. A baixa de
  contas a receber/pagar na web agora reutiliza uma `Idempotency-Key` durante
  uma repetição da mesma submissão. As listas de Compras e Vendas traduzem os
  status técnicos para linguagem operacional, preservando texto além da cor.
- **Motivo:** os contratos e operações de backend já existiam, mas a camada web
  precisava comunicar melhor os efeitos automáticos, orientar listas vazias e
  lidar com carregamento/erro por domínio, conforme o Design System.
- **Validação:** `pnpm test` passou (9 suítes, 31 testes); build da API passou;
  integração completa passou (13 suítes, 69 testes); `pnpm test:tenant` passou
  (5 suítes, 13 testes); `pnpm --filter @erp-mafa/web lint` e `git diff --check`
  passaram. O build web permanece configurado em Turbopack, sem webpack, mas
  falha neste ambiente — inclusive fora do sandbox — antes da compilação porque
  o sistema não autoriza criar o processo/vincular porta auxiliar (`Operation not
  permitted`). Não há erro de TypeScript ou lint associado.
- **Pendências / retomada:** nenhuma pendência funcional do escopo do Bloco 6.
  Antes de um deploy, validar `pnpm --filter @erp-mafa/web build` numa máquina
  cujo ambiente permita o processo auxiliar do Turbopack; não trocar para webpack
  como contorno.

### Bloco 5 — Auditoria e idempotência de comandos críticos

- **Período:** 2026-08-05
- **Status:** concluído
- **Objetivo:** ampliar rastreabilidade e impedir repetição de operações que
  alteram caixa, estoque ou estados financeiros.
- **Modificado:** auditoria transacional adicionada a recebimentos, pagamentos,
  cancelamentos de contas e transferências. `Idempotency-Key` passou a ser aceito
  em pagamentos de contas a receber/pagar e transferências; OpenAPI e dicionário
  de dados foram atualizados.
- **Validação:** build da API e integração completa passaram (13 suítes, 69 testes).
  A suíte financeira cobre replay de pagamento de conta a receber, conta a pagar
  e transferência com a mesma chave, verificando que a resposta é preservada.
- **Pendências / retomada:** expandir auditoria para identidade/configurações e
  demais ações de cadastro em um bloco futuro, conforme priorização de produto.

### Bloco 4 — RLS e isolamento multiempresa no banco

- **Período:** 2026-08-05
- **Status:** concluído
- **Objetivo:** cumprir `TA-DATA-005` com uma segunda camada de isolamento no
  PostgreSQL, sem substituir os filtros e autorizações existentes na aplicação.
- **Modificado:** adicionadas migrations de RLS para todas as tabelas com
  `company_id`, exceto entidades de identidade necessárias antes de haver tenant
  ativo (`memberships`, `invitations` e `refresh_tokens`). O papel de runtime
  `erp_mafa_app` não tem `BYPASSRLS`; `DATABASE_URL` passou a usar esse papel e
  `DIRECT_URL` ficou reservado a migrations/administração. A API agora abre uma
  transação por requisição autenticada, configura `app.current_company_id` com
  `SET LOCAL` e roteia os acessos Prisma para o cliente transacional através de
  `AsyncLocalStorage`. Idempotência foi ajustada para não abortar essa transação
  ao encontrar chave duplicada. O runbook ganhou instruções de deploy e
  diagnóstico de RLS.
- **Motivo:** filtros por `company_id` no código não protegem contra uma query
  futura sem filtro. RLS bloqueia leitura e escrita fora da empresa ativa mesmo
  nesse caso, desde que a API não use uma credencial administrativa.
- **Validação:** `pnpm --filter @erp-mafa/api build` passou;
  `pnpm --filter @erp-mafa/api test:integration` passou (13 suítes, 69 testes);
  `pnpm test:tenant` passou (5 suítes, 13 testes); `git diff --check` passou.
  O novo teste `rls-database-enforcement.integration-spec.ts` prova que uma
  consulta sem contexto não vê linhas e que contexto da empresa B não acessa
  linhas da empresa A, mesmo com filtro explícito.
- **Pendências / retomada:** em cada ambiente de deploy, provisionar a senha
  própria de `erp_mafa_app`, configurar `DATABASE_URL` para ela e manter
  `DIRECT_URL` restrita ao processo de migration. Nunca executar a API com a
  URL administrativa.

### Bloco 3 — Build reproduzível e fundação visual por tokens

- **Período:** 2026-08-05
- **Status:** concluído
- **Objetivo:** manter Turbopack, eliminar a dependência de rede que quebrava o
  build e reforçar o uso dos tokens na fundação visual compartilhada.
- **Modificado:** Inter (400/600/700) e JetBrains Mono (400/600) foram
  versionadas em `apps/web/src/app/fonts/`, com licenças e origem documentadas.
  `layout.tsx` passou de `next/font/google` para `next/font/local`; o pacote web
  é explicitamente ESM para eliminar o aviso do Tailwind config. `globals.css`
  passou a usar a variável de fonte local, tokens para sombra/erro e cor de
  navegação, e o breakpoint mobile configurado no Tailwind.
- **Motivo:** o build web falhava em ambiente sem rede ao buscar fontes externas.
  Além disso, havia cores e sombras soltas na camada global, contrariando a
  regra de que valores visuais devem vir de `tokens.json`.
- **Validação:** `pnpm --filter @erp-mafa/web build` passou com Next.js 16.3 e
  Turbopack; `pnpm --filter @erp-mafa/web lint` passou; `pnpm test` passou
  (9 suítes, 31 testes); `git diff --check` passou.
- **Pendências / retomada:** a base visual está apta para as próximas telas.
  Não retornar a `next/font/google` ou webpack sem nova decisão documentada.

### Bloco 2 — Padrão reutilizável de listagens

- **Período:** 2026-08-05
- **Status:** concluído
- **Objetivo:** consolidar busca, tabela/lista responsiva, paginação e os cinco
  estados obrigatórios de interface nas listagens de Produtos, Clientes e
  Fornecedores.
- **Modificado:** criado o conjunto compartilhado em
  `apps/web/src/components/listings/`, com componentes de busca, tabela,
  paginação, estado vazio, skeleton e erro acionável. As três páginas passaram
  a consumi-lo; receberam limites de carregamento e de erro próprios. A tabela
  continua usando a transformação existente em cards empilhados no mobile.
- **Motivo:** eliminar duplicação entre as três listagens, garantir os estados
  previstos em DS-TABLE-001/003/004 e reduzir o risco de novas telas divergirem
  dos tokens do Tailwind. O novo componente usa classes mapeadas pelos tokens,
  sem introduzir cores, medidas ou sombras soltas.
- **Validação:** `pnpm --filter @erp-mafa/web lint` passou;
  `pnpm --filter @erp-mafa/api build` passou; `git diff --check` passou. Não
  houve alteração de comportamento na API; permanecem válidas as suítes do
  Bloco 1.
- **Pendências / retomada:** o componente é a base para as próximas listagens.
  O build web completo continua pendente da estratégia de fontes do Bloco 3.

### Bloco 1 — CRUD de Produtos, Clientes e Fornecedores

- **Período:** 2026-08-05
- **Status:** concluído
- **Objetivo:** finalizar Produtos, Clientes e Fornecedores com criação, listagem,
  busca, edição e desativação, sem violar isolamento multiempresa, permissões ou
  regras de negócio.
- **Modificado:** foram preservadas e concluídas as mudanças locais preexistentes
  nos módulos de catálogo, clientes e fornecedores, rotas web, OpenAPI, dicionário
  de dados e teste de integração. Os três cadastros agora têm edição, inativação,
  reativação, busca e paginação. Produtos também registram histórico de preço com
  motivo e auditoria. Os formulários de clientes incluem Instagram/data de nascimento;
  os de fornecedores, documento/pessoa de contato.
- **Motivo:** fechar os cadastros-base ponta a ponta e corrigir duas divergências
  encontradas na revisão: custo não pode ser digitado na reprecificação ou criação
  (`DS-FORM-004`) e os campos já existentes nos cadastros precisavam estar acessíveis
  na interface.
- **Validação:** `pnpm test` passou (9 suítes, 31 testes);
  `pnpm --filter @erp-mafa/api build` passou;
  `pnpm --filter @erp-mafa/web lint` passou;
  `pnpm test:tenant` passou (5 suítes, 13 testes);
  `pnpm --filter @erp-mafa/api test:integration` passou (12 suítes, 68 testes).
  A suíte inclui atualização, reativação, busca/paginação, reprecificação/auditoria
  e tentativas de acesso entre empresas.
- **Pendências / retomada:** não há alteração de schema/migration neste bloco.
  O build web em Turbopack segue dependente da obtenção de fontes do Google no
  ambiente e será tornado reproduzível no Bloco 3, sem retorno ao webpack. O próximo
  passo é o Bloco 2: extrair e aplicar o padrão reutilizável de listagens.

## Débitos técnicos conhecidos que não devem ser esquecidos

- RLS obrigatório no PostgreSQL (`TA-DATA-005`) ainda não está presente nas
  migrations atuais; é escopo do Bloco 4.
- Auditoria e idempotência já existem, porém não cobrem todos os eventos e comandos
  críticos; é escopo do Bloco 5.
- O build deve continuar em Turbopack. A estratégia de fontes deve torná-lo
  reproduzível sem reintroduzir webpack; é escopo do Bloco 3.
- A arquitetura exige paginação em toda lista (`TA-API-001`), mas Produtos,
  Clientes e Fornecedores ainda retornam array sem `page` por compatibilidade
  temporária com seletores internos de Compras, Vendas e Estoque. O modo
  paginado é usado pelas telas. A remoção desse legado exige revisar esses três
  consumidores conjuntamente; não deve ser feita isoladamente em uma listagem.

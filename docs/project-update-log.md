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

### Bloco 23 — Dashboard operacional por perfil

- **Período:** 2026-08-06
- **Status:** concluído — aguardando validação visual e funcional do usuário.
- **Objetivo:** transformar Início em uma visão rápida e acionável do negócio,
  com período reproduzível, comparação equivalente, navegação até as origens e
  conteúdo realmente adaptado às permissões de cada papel.
- **Período e indicadores:** a tela aceita mês atual, últimos 30 dias, mês
  anterior ou intervalo personalizado; mostra datas exatas e informa que a
  comparação utiliza o período anterior equivalente. KPIs de faturamento,
  lucro estimado, saldo de caixa, ticket médio, estoque baixo e produtos ativos
  são compostos conforme o perfil, identificam competência/caixa/posição atual e
  levam à listagem que forma o número. Variações percentuais usam texto e seta,
  nunca somente cor.
- **Alertas e análise:** uma faixa acionável reúne estoque baixo, recebimentos
  vencidos e pagamentos vencidos. A evolução diária de vendas usa apenas a cor
  de acento, possui tooltip nativo e uma tabela acessível equivalente. Produtos
  mais vendidos consideram quantidade líquida após devoluções. Resumos de
  estoque, compromissos financeiros e resultado gerencial aparecem somente
  quando o usuário possui os dados necessários.
- **Responsividade e estados:** cards reorganizam de quatro colunas até uma; o
  filtro de período, alertas, gráfico e listas se adaptam ao mobile. Períodos sem
  vendas mostram estado vazio orientativo. A interface reutiliza tokens e ícones
  do sistema e mantém links claros para Vendas, Estoque, Produtos e Financeiro.
- **Segurança por perfil:** criada a permissão `view_dashboard` para Owner,
  Admin, Vendedor, Estoquista, Financeiro e Visualizador. Ela libera somente o
  endpoint do dashboard; DRE e demais relatórios continuam exigindo
  `view_reports`. O backend agora omite métricas de vendas, estoque, despesas,
  recebíveis, pagáveis, caixa, custo e lucro individualmente conforme as
  permissões do JWT. Assim, Vendedor recebe vendas/ticket/tendência sem caixa,
  despesas, valor de estoque, CMV ou lucro; Estoquista recebe apenas contexto de
  catálogo/estoque; dados sensíveis nunca dependem apenas de ocultação no Web.
- **Backend e contrato:** `GET /reporting/dashboard` passou a usar
  `view_dashboard` e ganhou série diária de vendas, cinco produtos mais vendidos
  e contadores de títulos vencidos. O lucro por produto é omitido sem
  `view_profit`. Seed e OpenAPI foram atualizados; não houve migration porque as
  permissões continuam armazenadas no array das roles existentes.
- **Modificado:** `apps/web/src/app/(app)/inicio/page.tsx`, estilos globais,
  controller/service/testes de Reporting, seed de roles,
  `docs/api/openapi.yaml` e este registro.
- **Validação:** TypeScript e ESLint do Web, build e 12 suítes/44 testes unitários
  da API e `git diff --check` passaram. A integração de Reporting passou com 1
  suíte/7 testes, incluindo o payload restrito de Vendedor; `pnpm test:tenant`
  passou com 5 suítes/14 testes. A seed foi executada no banco local e atualizou
  as roles com `view_dashboard`.
- **Pendências / retomada:** validar visualmente os quatro períodos, gráfico,
  alertas e visões de Owner/Vendedor/Estoquista. Sessões emitidas antes da seed
  podem precisar de novo login para que o JWT carregue `view_dashboard`.
  Relatórios completos/exportação continuam uma etapa separada; o Dashboard usa
  apenas análises já sustentadas pelos dados atuais.

### Bloco 22 — Padronização funcional e visual da tela de Financeiro

- **Período:** 2026-08-06
- **Status:** concluído — aguardando validação visual e funcional do usuário.
- **Objetivo:** substituir a página fragmentada de formulários e listas curtas
  por uma central financeira responsiva que diferencie claramente caixa
  realizado, valores previstos e configuração, preservando permissões e
  rastreabilidade.
- **Navegação e visão geral:** Financeiro foi dividido nas abas Visão geral, A
  receber, A pagar, Despesas, Fluxo de caixa e Configurações; cada aba só aparece
  quando o perfil possui a permissão correspondente. A visão geral apresenta
  saldo realizado das contas, valores previstos a receber/pagar e quantidade de
  títulos vencidos, sempre identificando regime de caixa ou previsto. Os cards
  são links para os históricos que compõem cada número. Somas de dinheiro no
  Server Component usam centavos inteiros, sem aritmética binária de ponto
  flutuante.
- **Contas a receber e pagar:** as listas passaram a exibir todo o histórico —
  pendentes, parciais, realizadas, vencidas e canceladas — com busca, filtro,
  paginação de 10 itens e estado vazio dentro do grid. O menu de três pontos
  oferece ficha detalhada, baixa total/parcial e cancelamento somente para quem
  possui permissão. A ficha mostra valor original, realizado, saldo, parte
  relacionada e pagamentos imutáveis; baixa usa modal curto, máscara BRL,
  juros/desconto e chave idempotente. Cancelamento exige motivo e permanece no
  histórico.
- **Despesas:** a listagem agora possui busca, filtro de status, identificação de
  competência/categoria/origem, detalhe e cancelamento contextual de despesas
  pendentes. O cadastro foi transformado em workspace de toda a área útil: cards
  distinguem `Já paguei` de `Vou pagar depois`, campos condicionais mostram
  conta ou vencimento, e o resumo lateral explica se a operação criará caixa
  realizado ou uma conta a pagar prevista.
- **Fluxo de caixa:** contas financeiras aparecem com saldo derivado das
  movimentações; o histórico realizado pode ser filtrado por conta e tipo e
  identifica origem, data, descrição, direção e valor. Transferências entre duas
  contas ativas são feitas em modal com máscara monetária e chave idempotente,
  deixando explícito que geram saída + entrada sem se tornarem receita ou
  despesa.
- **Configurações:** contas e formas de pagamento agora possuem grids
  persistentes, status, saldo/taxas, vínculos e ações de inativação com
  confirmação. Criações usam modais curtos; formas expõem tipo, conta de destino,
  taxa percentual e taxa fixa. Contas inativas continuam no histórico e o saldo
  nunca é editável.
- **Confiabilidade e backend:** `POST /expenses` passou a aceitar
  `Idempotency-Key`, corrigindo o conflito com TA-API-002 para despesas já pagas
  que criam saída de caixa. O teste financeiro repete o mesmo comando/chave e
  comprova uma única despesa e uma única movimentação. O BFF passou a encaminhar
  cancelamento de receivables, payables e despesas, além de inativação de contas
  e formas. O OpenAPI documenta a nova proteção; não houve alteração de schema
  ou migration.
- **Modificado:** módulos Web de `finance`, página `/financeiro`, rotas BFF de
  finanças/contas/formas, estilos globais, controller de despesas, teste de
  integração financeiro e `docs/api/openapi.yaml`.
- **Validação:** TypeScript e ESLint do Web, build e 12 suítes/44 testes unitários
  da API e `git diff --check` passaram. A integração financeira passou com 1
  suíte/7 testes; `pnpm test:tenant` passou com 5 suítes/14 testes, incluindo
  isolamento financeiro. O PostgreSQL do `docker-compose` foi iniciado para os
  testes e permanece disponível para a validação local. O build Turbopack não
  foi repetido devido ao bloqueio ambiental já documentado no Bloco 18; nenhuma
  troca para Webpack foi feita.
- **Pendências / retomada:** validar visualmente as seis abas, uma baixa parcial,
  cancelamento, despesa paga/futura, transferência e inativação. Edição de
  lançamentos, mudança auditada de vencimento, recorrência, saldo inicial,
  anexos, conciliação bancária e estorno de despesa já paga não foram inventados:
  não possuem contrato completo nesta fase ou estão classificados como futuros.
  O próximo domínio visual sugerido é o Dashboard/Início.
- **Ajuste visual pós-validação:** os ícones dos estados vazios dentro dos grids
  receberam caixa de 42 px e SVG de 21 px, evitando que ocupem a área da tabela.
  O cabeçalho dos workspaces de nova despesa, conta a receber e conta a pagar
  passou a declarar explicitamente seu layout flex; o botão de fechar permanece
  alinhado ao canto superior direito, ao lado do bloco de título/subtítulo.
  Na segunda revisão visual, o estado vazio passou a empilhar e centralizar
  explicitamente ícone, título e descrição; os workspaces também receberam uma
  separação de 16 px entre o subtítulo do cabeçalho e o card do formulário.

### Bloco 21 — Padronização funcional e visual da tela de Importações

- **Período:** 2026-08-06
- **Status:** concluído — aguardando validação visual e funcional do usuário.
- **Objetivo:** transformar o contrato de importação já disponível na API em um
  fluxo Web seguro, orientado e consistente com os workspaces dos demais
  domínios, sem misturar a listagem com o processo de importação.
- **Listagem e acesso rápido:** Importações agora abre em uma visão de histórico
  com indicadores de arquivos ativos, registros criados e linhas rejeitadas;
  busca por arquivo/tipo, filtros de tipo/status, paginação de 10 itens, grid
  persistente e estados vazios dentro da tabela. Cada linha possui menu contextual de três pontos para
  acessar o relatório. A ação `Nova importação` também foi adicionada ao menu
  global `Novo` e abre diretamente o workspace por `?new=import`.
- **Workspace em etapas:** ao iniciar uma importação, todo o conteúdo da
  listagem é ocultado. O fluxo responsivo usa as etapas Preparar arquivo →
  Revisar dados → Resultado, seleção de entidade por cards com radio button,
  download contextual do modelo CSV e área de upload por clique ou
  arrastar/soltar. Produtos, estoque inicial, clientes, fornecedores, despesas e
  contas a pagar/receber possuem descrições próprias; o campo monetário de total
  esperado aparece somente nos três tipos financeiros aos quais a conciliação
  realmente se aplica e reutiliza a máscara BRL compartilhada.
- **Prévia e confirmação:** a simulação apresenta status, dados identificados e
  erros por campo para cada linha. Decisões de duplicidade aparecem somente para
  produtos, conforme o contrato da API, com opções de usar existente, criar
  novo, registrar alias ou ignorar. Linhas inválidas são claramente marcadas
  como rejeitadas sem impedir o processamento das válidas. A confirmação mantém
  a mesma `Idempotency-Key` em uma repetição da tentativa e envia
  `expectedTotal` quando aplicável.
- **Resultado, relatório e reversão:** a etapa final diferencia criação,
  atualização, itens ignorados e rejeições, além de exibir totais conciliados e
  divergência. O relatório responsivo detalha o resultado por linha e permanece
  acessível pelo histórico. `window.confirm` foi removido; a reversão exige uma
  confirmação explícita em modal, reutiliza chave idempotente, preserva o
  registro para auditoria e comunica que somente efeitos criados serão
  compensados/inativados.
- **Modificado:**
  `apps/web/src/components/imports/import-workspace.tsx`,
  `apps/web/src/app/(app)/importacoes/page.tsx`,
  `apps/web/src/components/layout/app-header.tsx` e
  `apps/web/src/app/globals.css`. Nenhuma alteração de API, schema, migration ou
  regra de negócio foi necessária.
- **Motivo:** a primeira versão Web concentrava preparação, prévia, histórico e
  relatório em uma única coluna, usava select genérico para o tipo, confirmação
  nativa do navegador e não expunha conciliação ou erros detalhados. O novo fluxo
  aplica a hierarquia, responsividade, feedback e separação de contexto exigidos
  pelo Design System sem inventar capacidades fora do contrato existente.
- **Validação:** `pnpm --filter @erp-mafa/web exec tsc --noEmit`,
  `pnpm --filter @erp-mafa/web lint` e `git diff --check` passaram. A API não foi
  modificada e conserva a suíte de integração específica de Importações com 10
  cenários para modelo/prévia, idempotência, duplicidade, estoque inicial,
  conciliação, reversão, permissão e isolamento multiempresa. O build Turbopack
  não foi repetido devido ao bloqueio ambiental já documentado no Bloco 18; não
  houve troca para Webpack.
- **Pendências / retomada:** validar visualmente em desktop e mobile com arquivos
  reais dos sete modelos. Mapeamento livre de colunas, fuzzy matching,
  processamento assíncrono/fila e importação histórica de compras/vendas seguem
  fora deste bloco porque não existem no contrato atual ou são opcionais/futuros
  na BR. O próximo domínio visual sugerido é Financeiro; depois, Dashboard.

### Bloco 20 — Padronização funcional e visual da tela de Estoque

- **Período:** 2026-08-06
- **Status:** concluído — validação visual e funcional aprovada pelo usuário em
  2026-08-06.
- **Objetivo:** transformar Estoque em uma visão operacional clara de saldos e
  movimentações, preservando a regra de que saldo nunca é editado diretamente.
- **Visão de saldos:** a tela agora compõe uma posição para todas as variações do
  catálogo, inclusive produtos que ainda não tiveram movimentação e portanto
  possuem saldo zero. O grid persistente mostra Produto, SKU, situação,
  disponível, reservado, em trânsito e Ações; possui busca por nome/SKU, filtro
  por situação, paginação e estados vazios dentro da própria tabela. Produtos
  inativos continuam identificados no histórico conforme BR §10.7 regra 12.
- **Indicadores e alertas:** os cards mostram variações controladas, produtos em
  estoque baixo e variações sem estoque. Quantidades de unidades diferentes não
  são somadas em um total enganoso. O alerta de mínimo foi preservado e recebeu
  hierarquia visual consistente com o restante do sistema.
- **Ações e ficha:** cada posição possui menu contextual com histórico e, para
  quem tem `adjust_stock`, atalho de ajuste já selecionando a variação. A ficha
  responsiva apresenta saldos, entradas, saídas, ajustes e tabela de
  movimentações com origem, motivo, data e quantidade com sinal.
- **Ajuste de estoque:** o formulário compacto foi substituído por workspace em
  toda a área útil. O usuário escolhe explicitamente Entrada ou Saída, produto e
  quantidade absoluta, visualiza saldo atual/delta/saldo resultante e informa
  justificativa. Saída acima do disponível é impedida no web e continua
  obrigatoriamente bloqueada pela API; confirmação usa chave idempotente e gera
  movimentação/auditoria imutáveis.
- **Backend e contratos:** `GET /inventory/movements` passou a incluir a
  identificação da variação/produto e os dados do ajuste manual (motivo e
  sinalização de aprovação), mantendo filtro opcional por variante, permissão
  `view_inventory` e escopo por `company_id`. OpenAPI, dicionário de dados e o
  teste de integração foram atualizados.
- **Validação:** lint e TypeScript da API e do web passaram; 12 suítes/44 testes
  unitários e 14 suítes/87 testes de integração passaram; `git diff --check`
  passou. O build Turbopack não foi repetido pelo bloqueio ambiental já isolado
  no Bloco 18; nenhuma troca para Webpack foi feita.
- **Pendências / retomada:** validar visualmente filtros, paginação, ficha e
  ajuste positivo/negativo. Reservas, transferências entre estoques, lotes,
  validade e bucket separado para avarias permanecem fora desta rodada porque a
  BR os classifica como futuros ou o modelo atual ainda não oferece o fluxo
  correspondente.

### Bloco 19 — Padronização funcional e visual da tela de Fornecedores

- **Período:** 2026-08-06
- **Status:** concluído — validação visual e funcional aprovada pelo usuário em
  2026-08-06.
- **Objetivo:** aplicar a Fornecedores o padrão de CRUD consolidado em Produtos e
  Clientes, com histórico comercial, formulário responsivo e ações autorizadas.
- **Listagem e ações:** o componente legado com edição inline foi substituído por
  um grid persistente com Fornecedor/documento, contato, WhatsApp, e-mail, status
  e coluna de Ações fixa. Estados vazio e sem resultado permanecem dentro da
  tabela. O botão `Novo fornecedor` ocupa o mesmo bloco de ação de Produtos e
  Clientes. O menu contextual oferece ficha para `view_purchasing` e oculta
  edição/status de quem não possui `manage_purchasing`.
- **Cadastro e edição:** criação e edição ocupam toda a área útil e escondem
  métricas, busca e listagem. Identificação e contato comercial foram separados
  em seções alinhadas e responsivas. Campos opcionais agora aceitam `null`, o que
  permite limpar documento, contato, telefones e e-mail sem apagar o fornecedor.
- **Ficha e indicadores:** o modal mostra dados comerciais, cinco compras
  recentes, compras válidas, compra média, produtos fornecidos, última compra,
  total comprado e saldo a pagar. Valores consolidados são calculados no backend
  com `Prisma.Decimal`; compras em moeda estrangeira usam `exchange_rate` para o
  resumo em BRL, enquanto a compra recente preserva sua moeda de origem.
- **Backend e segurança:** adicionado `GET /purchasing/suppliers/:id`, protegido
  por `view_purchasing` e filtrado por `company_id`. A API passou a rejeitar
  fornecedores inativos em criação/edição de compras e clientes inativos em
  criação/edição de vendas; os filtros visuais agora possuem a mesma garantia no
  backend. Inativação continua lógica e preserva todo o histórico.
- **Documentação:** OpenAPI e dicionário de dados descrevem a ficha agregada,
  campos anuláveis e indicadores. Prazo médio, atrasos e qualidade percebida não
  foram exibidos: a BR §10.5 os classifica como futuros e o modelo atual ainda
  não registra previsão logística nem avaliação do fornecedor.
- **Validação:** lint e TypeScript da API e do web passaram; 12 suítes/44 testes
  unitários e 14 suítes/87 testes de integração passaram; `git diff --check`
  passou. O build Turbopack não foi repetido porque a rodada anterior já isolou o
  bloqueio ambiental de abertura de porta no processamento de CSS, sem relação
  com os tipos ou módulos alterados e sem autorização para trocar de bundler.
- **Pendências / retomada:** validar visualmente listagem, busca, criação, edição,
  ficha, indicadores e mudança de status com dados locais. Endereço, país,
  observações e prazo médio exigem evolução do domínio/migration e permanecem
  registrados para uma fase própria.

### Bloco 18 — Padronização funcional e visual da tela de Clientes

- **Período:** 2026-08-06
- **Status:** concluído — validação visual e funcional aprovada pelo usuário em
  2026-08-06.
- **Objetivo:** transformar Clientes no segundo cadastro-base do padrão de CRUD,
  com consulta de relacionamento, formulário responsivo, ações seguras e
  preservação do histórico após inativação.
- **Listagem e ações:** a tela agora mantém o grid visível nos estados vazio e
  sem resultado, com Cliente, contato principal, e-mail, nascimento, status e
  coluna de Ações fixa. O menu de três pontos oferece `Visualizar` para quem tem
  `view_customers` e oculta `Editar`/`Inativar`/`Reativar` de quem não possui
  `manage_customers`. A antiga edição inline e a marcação inválida de `<section>`
  dentro do `<tbody>` foram removidas.
- **Cadastro e edição:** o formulário passou a ocupar toda a área útil e esconde
  métricas, busca e listagem enquanto estiver aberto. Os campos foram agrupados
  em Identificação e Contatos, com alinhamento/responsividade, possibilidade de
  limpar dados opcionais e orientação de proteção de dados. E-mail ou telefone
  repetido na página gera um alerta de possível duplicidade, sem impedir que o
  usuário confirme o cadastro, conforme BR §10.9 regra 3.
- **Ficha do cliente:** o modal apresenta contatos, status, histórico das cinco
  vendas mais recentes e indicadores de compras registradas, ticket médio,
  produtos diferentes, última compra, total comprado e saldo em aberto. Datas de
  nascimento são tratadas como datas civis para não sofrer deslocamento pelo
  fuso horário.
- **Backend e segurança:** adicionado `GET /customers/:id`, protegido por
  `view_customers` e sempre filtrado pelo `company_id`. Totais e saldos são
  calculados no backend com `Prisma.Decimal`; a resposta não mistura tenants.
  Os schemas de criação/edição passaram a aceitar `null` nos campos opcionais,
  permitindo removê-los sem apagar o cliente. OpenAPI, dicionário de dados e
  testes de integração foram atualizados.
- **Validação:** lint e TypeScript da API e do web passaram; 12 suítes/44 testes
  unitários e 14 suítes/84 testes de integração passaram; `git diff --check`
  passou. O build Turbopack foi tentado dentro e fora do sandbox, mas o processo
  interno de CSS falhou ao tentar abrir uma porta (`Operation not permitted`);
  não houve troca para Webpack e as validações estáticas permaneceram aprovadas.
- **Pendências / retomada:** validar visualmente a listagem, criação, edição,
  ficha e mudança de status com dados locais. Endereço, observações, tags e
  preferências constam na visão ampla da BR §10.9, mas não existem no modelo de
  dados atual do MVP; incluí-los exige uma evolução de domínio com migration e
  será planejado separadamente, sem inventar campos apenas no frontend.
- **Ajuste após validação visual:** o botão `Novo cliente` foi retirado de baixo
  da busca e movido para o mesmo bloco de ação usado em Produtos, logo após o
  título e antes das métricas, alinhado à direita. Ao abrir o formulário, esse
  bloco continua oculto junto com o restante da listagem.

### Bloco 17 — Padronização funcional e visual da tela de Produtos

- **Período:** 2026-08-06
- **Status:** concluído — fluxo aprovado pelo usuário antes do avanço para
  Clientes.
- **Objetivo:** transformar Produtos no cadastro-base do padrão de CRUD aprovado
  em Vendas e Compras, expondo apenas operações suportadas e preservando custo,
  estoque, histórico e isolamento multiempresa.
- **Listagem:** o grid permanece visível vazio ou sem resultado de busca e
  mostra Produto/unidade, SKU, Categoria, Preço de venda, Status e a coluna de
  Ações fixa à direita. O estado vazio orienta o primeiro cadastro; busca sem
  resultado oferece limpar o filtro. Métricas e paginação existentes foram
  preservadas.
- **Ações e ficha:** os botões inline foram substituídos pelo menu contextual de
  três pontos. `Visualizar` está disponível a quem consulta o catálogo e abre
  uma ficha responsiva com classificação, variações, controle de estoque, saldo
  condicionado a `view_inventory`, preço, custo calculado, margem e histórico
  completo de preços. `Editar cadastro`, `Reprecificar` e
  `Inativar/Reativar` aparecem somente com `manage_catalog`; reprecificação e
  mudança de status usam dialogs acessíveis e confirmação explícita.
- **Formulário:** criação e edição passaram a ocupar a área de trabalho, sem a
  listagem ao fundo. O formulário agora inclui categoria, marca, unidade,
  estoque mínimo e preço inicial com máscara de Real. Custo aparece apenas como
  informação calculada. Edição permite remover categoria, marca e estoque
  mínimo; preço continua no fluxo de reprecificação com motivo e histórico.
- **Backend e segurança:** adicionado `GET /catalog/products/{id}` com histórico
  completo de preços e escopo obrigatório da empresa. A listagem continua
  retornando somente o preço vigente para não aumentar o payload dos seletores.
  A API de Compras e Vendas agora rejeita variantes cujo produto esteja inativo,
  e os seletores web ocultam esses produtos, cumprindo BR §10.3 regra 3 também
  no backend. O OpenAPI e os testes de catálogo/tenant foram atualizados.
- **Validação:** ESLint dos arquivos da API, TypeScript da API sem emissão, lint
  web, TypeScript web, 12 suítes/44 testes unitários e `git diff --check`
  passaram. A suíte de integração não iniciou porque `erp_mafa_test` continua
  indisponível em `localhost:5432` (`P1001`). O build Nest com emissão não foi
  repetido porque o diretório `dist` estava em uso pelo processo local em watch
  (`ENOTEMPTY`); a validação TypeScript equivalente passou sem alterar esse
  processo.
- **Pendências / retomada:** validar visualmente o grid, cadastro, ficha,
  reprecificação e estados com dados locais; executar integração e tenant quando
  o PostgreSQL de testes estiver disponível. Após a aprovação visual do usuário,
  concluir o bloco e seguir para Clientes.
- **Incidente local de login:** o `502` retornado pelo web não era uma falha de
  credenciais ou do fluxo de autenticação. O web estava ativo na porta `3000`,
  mas a API não iniciou na `3001` porque o PostgreSQL local estava parado
  (`Prisma P1001` em `localhost:5432`). O serviço `postgres` foi iniciado pelo
  Docker Compose e a API foi reiniciada; `GET /api/v1` respondeu `200 OK`. Não
  foi necessária alteração de código para corrigir o incidente.
- **Ajustes após validação visual:** o ícone compartilhado de ações passou a
  desenhar três pontos preenchidos e com maior contraste, garantindo que o menu
  contextual fique identificável na listagem de Produtos e nos demais grids que
  usam o mesmo componente. O workspace de criação/edição de produto também
  deixou de usar os limites concorrentes de `960px`/`1100px` e agora ocupa toda
  a área útil da página, mantendo a quebra responsiva dos campos.
- **Validação dos ajustes visuais:** lint e TypeScript sem emissão do web
  passaram; `git diff --check` passou.

### Bloco 16 — Padronização funcional e visual da tela de Compras

- **Período:** 2026-08-06
- **Status:** concluído — fluxo aprovado pelo usuário antes do avanço para
  Produtos.
- **Objetivo:** aplicar à tela de Compras o padrão aprovado em Vendas, mantendo
  as regras específicas de recebimento, custo calculado e estoque derivado.
- **Listagem e UI:** a tabela agora permanece visível no estado vazio e exibe
  Compra/data, Fornecedor, Status, Itens, Total e Ações. O fornecedor usa o
  fallback `Não informado`; a soma apresentada considera mercadorias e custos
  adicionais já rateados. Foram mantidos os três indicadores superiores e
  adicionado o mesmo menu contextual acessível de três pontos usado em Vendas.
  A visualização abre uma ficha responsiva com fornecedor, moeda, itens,
  quantidades pedidas/recebidas, custos unitários, histórico de recebimentos e
  resumo da compra. Ícones, cores semânticas, estados e responsividade reutilizam
  os componentes e tokens existentes.
- **Edição e cancelamento:** `Editar rascunho` remonta o wizard preenchido e usa
  o novo `PATCH /purchasing/purchases/{id}`. Somente `draft` pode ser editado;
  itens substituídos recebem `deleted_at`, sem exclusão física, e a operação
  gera `purchase.draft_updated`. `Cancelar compra` aparece apenas em `draft` ou
  `ordered`, exige confirmação, usa idempotência e registra
  `purchase.cancelled`. Compras parcial ou totalmente recebidas não mostram
  cancelamento porque o estorno de estoque/custo ainda não foi implementado,
  conforme BR §10.6.6 e o contrato já existente. Não foi criada ação Excluir.
- **Backend e contratos:** os detalhes de compra agora retornam produto/variante
  dos itens ativos para suportar a ficha visual. Foram adicionadas rotas BFF de
  edição e cancelamento, documentação OpenAPI, eventos no dicionário de dados e
  cenários de integração para edição por estado e isolamento multiempresa.
- **Correção posterior:** o cálculo do total da listagem foi movido para a
  própria página servidor. Ele havia sido exportado pelo componente cliente de
  ações, o que fazia o Next.js bloquear sua execução após existir uma compra na
  lista (`Attempted to call ... from the server`). O cálculo da ficha continua
  local ao componente cliente, sem atravessar a fronteira Server/Client.
- **Ajuste de visibilidade das ações:** a coluna compacta de ações passou a
  permanecer fixa à direita da tabela, evitando que o botão de três pontos fique
  fora da área visível em larguras menores. O mesmo tratamento foi aplicado em
  Vendas para preservar o padrão; no mobile a célula volta ao fluxo do card.
- **Validação:** build da API, lint web, TypeScript web com `tsc --noEmit`, 12
  suítes/44 testes unitários da API e `git diff --check` passaram. A suíte de
  integração não iniciou porque o PostgreSQL de testes em `localhost:5432`
  permanece desligado (`P1001`). O build Turbopack foi novamente impedido pelo
  ambiente ao tentar abrir porta interna durante o PostCSS (`Operation not
  permitted`), a mesma restrição registrada no Bloco 15.
- **Pendências / retomada:** validar visualmente listagem, menu, ficha e edição
  com dados locais; executar `pnpm --filter @erp-mafa/api test:integration` e
  `pnpm test:tenant` quando o banco de testes estiver disponível. Após a revisão
  do usuário, decidir se o recebimento parcial precisa de uma ação dedicada na
  listagem ou continuará fora do fluxo rápido do MVP.

### Bloco 15 — Revisão funcional e visual da tela de Vendas

- **Período:** 2026-08-06
- **Status:** concluído — fluxo aprovado pelo usuário antes do avanço para
  Compras.
- **Objetivo:** revisar a tela de Vendas ponta a ponta, acrescentando ações e
  detalhes ausentes sem violar imutabilidade, estoque derivado ou financeiro.
- **Modificado nesta etapa:** a tabela ganhou coluna de ações. `Visualizar` está
  disponível a quem pode consultar vendas e abre um dialog responsivo com
  cliente, canal, status, itens, pagamento, subtotal, desconto e total. `Editar`
  aparece somente para rascunhos e reabre o wizard preenchido; a API recebeu
  `PATCH /sales/{id}`, restrito a `manage_sales` e ao status `draft`. Itens
  substituídos são inativados (`deleted_at`) em vez de apagados e a alteração é
  auditada como `sale.draft_updated`. `Cancelar` aparece somente para rascunhos
  e confirmadas, exige confirmação explícita e usa idempotência.
- **Cancelamento e regra de exclusão:** não foi criado botão Excluir, porque BR
  §10.10.20 e a regra de integridade nº 9 proíbem apagar uma venda confirmada.
  O cancelamento mantém o registro e muda seu estado. Foi corrigida uma lacuna
  anterior do backend: ao cancelar venda confirmada, a mesma transação agora
  recompõe o estoque, cria saídas financeiras negativas correspondentes às
  entradas originais e registra `sale.cancelled` em auditoria.
- **Permissões e isolamento:** visualização continua protegida por `view_sales`;
  edição e cancelamento por `manage_sales`, com checagem real na API. O novo
  teste de tenant cobre tentativa de editar pela empresa errada.
- **Documentação:** `docs/api/openapi.yaml` documenta edição de rascunho e o
  cancelamento idempotente com estorno financeiro; o dicionário de dados inclui
  os novos eventos de auditoria.
- **Refinamento de UI/UX:** os botões soltos da coluna de ações foram
  substituídos por um menu contextual acessível de três pontos, construído com
  `@radix-ui/react-dropdown-menu`. Cada opção possui ícone, descrição curta e
  cor semântica; opções de edição e cancelamento continuam ocultas quando o
  estado ou a permissão não permitem a operação. O dialog de visualização foi
  redesenhado como uma ficha responsiva de venda, com cabeçalho e status,
  resumo de cliente/canal/quantidade, cards de itens e pagamento e painel
  financeiro destacado. Todos os estilos reutilizam os tokens existentes.
- **Correção de edição:** o wizard agora é remontado com uma chave vinculada à
  venda selecionada. Assim, navegar pela ação `Editar rascunho` reaplica os
  dados da venda e abre o formulário, em vez de preservar o estado fechado da
  renderização anterior.
- **Fechamento da listagem:** adicionada a coluna `Cliente`, usando
  `Consumidor final` quando a venda não possui cliente associado. O estado sem
  vendas passou a ser exibido dentro da própria tabela, preservando cabeçalho,
  largura das colunas e contexto visual. Quando também não há produtos, a mesma
  área orienta sobre o cadastro necessário. O estado “nenhum resultado” não foi
  simulado porque Vendas ainda não possui busca ou filtros contratados.
- **Validação:** build da API, build web Next.js 16.3/Turbopack, lint web,
  12 suítes/44 testes unitários da API e `git diff --check` passaram. Os testes
  de integração foram atualizados para edição, isolamento e estorno de caixa,
  mas não puderam executar porque o PostgreSQL de testes em `localhost:5432`
  está desligado (`P1001`). Executar `pnpm --filter @erp-mafa/api
  test:integration` e `pnpm test:tenant` quando o banco estiver disponível.
- **Validação do refinamento:** `pnpm --filter @erp-mafa/web lint`,
  `pnpm --filter @erp-mafa/web build` (Next.js 16.3 com Turbopack) e
  `git diff --check` passaram após o menu, o novo dialog e a correção de edição.
- **Validação do fechamento da listagem:** lint web, TypeScript com `tsc
  --noEmit` e `git diff --check` passaram. Uma nova execução do build Turbopack
  foi impedida pelo ambiente ao processar CSS (`binding to a port: Operation
  not permitted`), inclusive fora do sandbox; o build completo imediatamente
  anterior a este ajuste já estava aprovado.
- **Pendências / retomada:** validar visualmente os dialogs e ações com dados
  locais; continuar a revisão da tela de Vendas conforme os próximos pontos do
  usuário. O bloco permanece em andamento.

### Bloco 12 — Sidebar agrupada e colapsável

- **Período:** 2026-08-06
- **Status:** concluído
- **Objetivo:** aplicar à navegação lateral a referência visual fornecida pelo
  usuário, mantendo o controle de acesso por permissão e a responsividade atual.
- **Modificado:** a sidebar passou a organizar os destinos em Visão geral,
  Comercial, Suprimentos e Financeiro, com separadores, ícones de mesmo traço,
  chevrons e estado ativo em acento dourado translúcido. O cabeçalho ganhou
  marca maior e controle funcional de recolher/expandir; o rodapé exibe o nome
  e o papel reais da sessão. No modo recolhido, a largura do shell acompanha a
  sidebar e os rótulos ficam disponíveis como `title` nos ícones.
- **Motivo:** a referência deixa a hierarquia de navegação mais limpa e reduz a
  carga visual, especialmente para os módulos operacionais mais usados.
- **Decisão visual:** o texto do Design System indica `accent-subtle` no item
  ativo, mas a referência aprovada pede fundo escuro. Foi usada uma mistura
  translúcida do `--brand-accent` sobre a superfície neutra escura, sem criar
  cor solta nem trocar a paleta funcional do produto.
- **Validação:** `pnpm --filter @erp-mafa/web lint`,
  `pnpm --filter @erp-mafa/web exec tsc --noEmit` e `git diff --check` passaram.
- **Ajuste posterior:** após revisão visual do usuário, a sidebar retornou à
  densidade original do ERP (248px, texto de 14px e ícones de 19px). Cabeçalho,
  marca, controle, rodapé e altura das linhas foram compactados para exibir o
  nome completo da loja, preservando a nova hierarquia e os estados visuais.
- **Ajuste fino:** o controle de expandir no modo recolhido foi centralizado na
  largura de 76px da sidebar.
- **Pendências / retomada:** nenhuma para a sidebar; o build Turbopack completo
  permanece condicionado à limitação local já registrada no Bloco 11.

### Bloco 13 — Header com busca rápida e ações

- **Período:** 2026-08-06
- **Status:** concluído
- **Objetivo:** modernizar a barra superior com referência visual aprovada,
  sem fingir que existe uma busca global que a API ainda não oferece.
- **Modificado:** criado o header de aplicação com marca da empresa, busca rápida
  por escopo (Produtos, Clientes ou Fornecedores) e botão “Novo”. A busca leva
  para as listagens existentes já filtradas por `q`. O botão abre um dialog
  acessível, baseado na primitive `@radix-ui/react-dialog` do shadcn/ui, e mostra
  somente ações que o perfil pode executar; cada ação abre a respectiva tela
  operacional. Foram adicionados os estilos tokenizados de header, dialog e
  opções de ação, incluindo redução de movimento e comportamento mobile.
- **Motivo:** reduzir passos até consultas e operações frequentes, mantendo a
  autorização no backend e evitando um campo de busca global que não entregaria
  o resultado prometido.
- **Decisão técnica:** foi instalada apenas a dependência de dialog do Radix, sem
  migração dos componentes existentes. Isso resolve a necessidade de modal
  acessível e aproxima a base da decisão arquitetural de usar shadcn/ui de forma
  incremental.
- **Pendência:** uma busca global real (produtos, clientes, fornecedores, vendas
  etc. na mesma consulta) exige novo módulo/endpoint multiempresa, documentação
  e testes próprios; não foi simulada nesta interface.
- **Validação:** `pnpm --filter @erp-mafa/web lint`,
  `pnpm --filter @erp-mafa/web exec tsc --noEmit` e `git diff --check` passaram.
- **Ajuste posterior:** o container do header deixou de usar borda externa,
  sombra e margem de card flutuante. Voltou a integrar a barra superior da
  aplicação, preservando a nova composição interna.
- **Ajuste posterior:** o ícone de “+” do botão Novo foi isolado em contêiner
  próprio para garantir sua visibilidade. As ações do dialog agora passam o
  parâmetro `new` para a rota e abrem diretamente o formulário correto (Venda,
  Compra, Produto, Cliente, Fornecedor, Despesa, Recebimento ou Ajuste), ainda
  condicionadas às mesmas permissões que controlam os comandos no backend.
- **Correção posterior:** a busca rápida deixou de depender de `router.push` no
  cliente e passou a submeter um formulário `GET` nativo para a listagem do
  escopo selecionado. Enter agora funciona também antes da hidratação do React.
- **Correção posterior:** o selo “Enter” foi transformado em botão real de envio
  da busca, com cursor, hover e rótulo acessível.

### Bloco 14 — Listagens operacionais e wizards de CRUD

- **Período:** 2026-08-06
- **Status:** concluído
- **Objetivo:** aplicar as referências aprovadas às listagens e aos fluxos de
  Venda/Compra, preservando os dados, permissões e comandos hoje disponíveis.
- **Modificado:** criada uma faixa reutilizável de indicadores para listagens.
  Produtos, Clientes e Fornecedores mostram totais, ativos e resultados atuais;
  Vendas e Compras mostram apenas métricas calculadas do histórico retornado
  pela API. Vendas também passou a exibir data/hora abaixo do identificador.
  Os wizards de Venda e Compra ganharam layout de duas colunas no desktop:
  tarefa/etapa à esquerda e resumo persistente à direita; no mobile o resumo
  permanece acessível acima do conteúdo. A estrutura de etapas existente e a
  lógica de idempotência, custo calculado e estoque derivado foram preservadas.
- **Não aplicado nesta rodada:** filtros por status/período, exportação e
  paginação em Vendas/Compras não têm contratos de API; desconto, parcelas,
  observações e frete de venda também não existem no comando atual. Esses
  controles não foram simulados na interface para evitar promessas sem efeito.
- **Validação:** `pnpm --filter @erp-mafa/web lint`,
  `pnpm --filter @erp-mafa/web exec tsc --noEmit` e `git diff --check` passaram.
- **Ajuste posterior:** quando um wizard ou formulário de criação é aberto, a
  listagem, os indicadores e a busca da respectiva tela passam a ficar ocultos,
  mantendo o foco no fluxo em andamento. Venda ganhou cartões de forma de
  pagamento com radio button e estado selecionado; outros cartões só serão
  adicionados quando houver dados/ações correspondentes no contrato atual.
- **Reformulação visual dos wizards:** os fluxos de Venda e Compra deixaram de
  usar a superfície compacta de formulário dentro da listagem e passaram a
  ocupar toda a área útil da página, com título próprio, indicador de progresso
  ampliado, etapa principal em card, resumo persistente e barra de ações clara.
  Campos de item agora têm alturas e larguras consistentes; cada etapa ganhou
  título, orientação contextual e revisão final. Em Compra, a decisão sobre
  frete passou a usar cartões com radio button (`Sem frete` ou `Informar frete`),
  exibindo o valor somente quando aplicável. O layout responde em três faixas:
  resumo lateral e fixo no desktop, resumo horizontal abaixo do formulário em
  telas médias e controles totalmente empilhados no celular.
- **Motivo da reformulação:** a composição anterior ainda parecia um formulário
  auxiliar comprimido e não reproduzia a hierarquia, o aproveitamento de tela e
  a experiência dedicada mostrados nas referências aprovadas.
- **Validação da reformulação:** `pnpm --filter @erp-mafa/web build` (Next.js
  16.3 com Turbopack), `pnpm --filter @erp-mafa/web lint`,
  `pnpm --filter @erp-mafa/web exec tsc --noEmit` e `git diff --check` passaram.
- **Ajuste de campos e progresso:** criado `SelectField`, seletor compartilhado
  com altura igual à dos inputs, chevron próprio e estados de hover/foco. Ele
  foi aplicado aos wizards e aos formulários operacionais de baixa financeira,
  despesa e ajuste de estoque. O seletor compacto do header e os seletores
  densos da tabela de importação preservam suas variantes específicas porque o
  componente completo com rótulo não se aplica a esses contextos. O progresso
  dos wizards teve sua estrutura corrigida: os conectores agora ficam depois do
  rótulo de cada etapa e alinhados ao centro dos círculos, desaparecendo no
  mobile em vez de atravessar o conteúdo.
- **Ajuste monetário e desconto:** criado `CurrencyInput` conforme DS-FORM-003,
  com máscara brasileira em tempo real, entrada direta por dígitos e valor
  decimal limpo enviado pelo formulário. Todos os campos monetários editáveis
  atuais do web foram migrados: preço unitário de Venda, custo unitário e frete
  de Compra, reprecificação, despesas, contas a receber/pagar, juros, descontos
  e baixas. Venda passou a expor o desconto geral já suportado pela API, separado
  do preço unitário e limitado ao subtotal no fluxo; subtotal, desconto e total
  líquido aparecem no resumo. O desconto por item permanece fora deste wizard
  simples, pois o Documento de Negócio permite desconto direto geral no MVP.
- **Decisão de negócio:** preço livre não substitui desconto. O preço informa o
  valor unitário negociado; o desconto precisa permanecer explícito para receita
  bruta/líquida, margem e auditoria. A política configurável de limite e aprovação
  para descontos elevados ainda não existe e deve ser tratada em bloco próprio
  de API, permissões, configuração e testes antes de ser apresentada na UI.
- **Validação dos ajustes:** `pnpm --filter @erp-mafa/web build` (Turbopack),
  `pnpm --filter @erp-mafa/web lint`, `pnpm --filter @erp-mafa/web exec tsc
  --noEmit` e `git diff --check` passaram.
- **Padronização global de seletores:** todos os elementos `<select>` do web
  passaram a ser renderizados pelo componente compartilhado. `SelectField`
  atende formulários com rótulo e ajuda; `SelectControl` reutiliza a mesma
  anatomia, chevron e estados nos contextos compactos do header e das decisões
  em tabela da Importação. A configuração financeira também foi reorganizada
  para consumir o componente sem alterar seus contratos ou permissões.
- **Correção de alinhamento dos campos:** `.field` agora se alinha pelo início e
  dimensiona apenas o próprio conteúdo dentro dos grids. Assim, a linha de ajuda
  ou validação fica abaixo de seu controle sem distribuir altura adicional entre
  rótulo e input; os inputs vizinhos permanecem alinhados pelo topo mesmo quando
  somente um deles possui texto auxiliar.
- **Correção visual pontual dos wizards:** os campos de quantidade de Venda e
  Compra deixaram de aninhar o input dentro do label e agora usam a mesma
  anatomia `label → controle` dos demais campos, restaurando o espaçamento de
  8px. Na grade de Dados gerais, as três colunas passaram a compartilhar faixas
  explícitas para rótulo, controle de 46px e texto auxiliar; o desconto permanece
  alinhado a Cliente e Canal mesmo tendo uma orientação abaixo do campo.
- **Correção de navegação do wizard:** o botão `Continuar` e o submit final agora
  têm identidades e tipos explícitos, evitando que o React reaproveite o mesmo
  elemento como submit durante a troca da etapa 2 para a 3. O handler do
  formulário também bloqueia qualquer conclusão fora da etapa de confirmação;
  Enter nas etapas anteriores apenas valida e avança. Venda só é registrada por
  `Concluir venda` na terceira etapa. A mesma proteção foi aplicada ao wizard de
  Compra por compartilhar a estrutura suscetível ao problema.
- **Validação da padronização global:** não restaram `<select>` fora da
  implementação compartilhada. Build Next.js 16.3/Turbopack, lint, TypeScript e
  `git diff --check` passaram.
- **Pendências / retomada:** criar um bloco de API/documentação/testes quando
  filtros, exportação ou campos adicionais de venda forem priorizados.

### Bloco 11 — Refinamento visual e UX da web

- **Período:** 2026-08-06
- **Status:** concluído
- **Objetivo:** alinhar o shell e as telas ao Design System e aos wireframes.
- **Modificado:** barra lateral em `neutral-900`, com acento no item ativo, e
  símbolos tipográficos substituídos por ícones SVG consistentes. O dashboard
  ganhou hierarquia de período, cards e alertas acionáveis; componentes
  compartilhados de campo, tabela e badge receberam foco, hover e tipografia
  alinhados aos tokens para beneficiar todas as listagens e formulários. A
  fundação CSS foi normalizada em torno de grids/flex: espaçamento consistente
  em cards, formulários, campos, ações e conteúdo central, com `gap` no lugar
  de margens dispersas.
- **Motivo:** a apresentação visual não acompanhava a qualidade da base funcional.
- **Validação:** lint web e `git diff --check` passaram.
- **Continuação:** Produtos, Clientes e Fornecedores agora compartilham uma
  superfície de busca com campo e ação alinhados. As ações de cada linha foram
  separadas das ações do cabeçalho para preservar o alinhamento de seu contexto.
  Estados vazios receberam marcador visual tokenizado, enquanto os wizards de
  compra e venda passaram a agrupar melhor os itens e o resumo do valor.
- **Continuação operacional:** Estoque e Financeiro receberam seções explícitas
  com título, contexto e espaçamento próprio. A configuração financeira agora
  identifica a relação entre contas e formas de recebimento e mostra um estado
  vazio orientativo quando não há contas. Foram também refinados o hover do
  fechamento de formulários, a leitura de badges em tabela e o comportamento
  dessas seções no mobile.
- **Continuação de layout:** os acionadores de Produto, Compra, Venda e Ajuste
  de Estoque foram retirados do fluxo lateral do cabeçalho. Fechados, ficam
  alinhados como ação principal; abertos, seus formulários ocupam uma área de
  trabalho abaixo do título e antes da listagem, sem reduzir a leitura do
  contexto ou da tabela. A regra é compartilhada por `page-workspace-action`.
- **Continuação de Importações:** a tela foi reorganizada em áreas de preparo,
  prévia, histórico e relatório. A prévia destaca as contagens de linhas prontas,
  pendentes de decisão e com erro; cada duplicidade agora apresenta sua decisão
  em um controle visualmente separado. O histórico inclui data/hora e o relatório
  usa indicadores para criação, atualização, rejeição e conciliação, mantendo o
  aviso de que a reversão é rastreável e não apaga registros.
- **Continuação de cadastros e acesso:** os formulários de login e cadastro
  receberam o mesmo espaçamento vertical dos formulários operacionais (eles não
  usam `form-card`, portanto precisavam de uma regra própria). A ação de criar
  Cliente/Fornecedor passou a ter toolbar dedicada e a edição dentro da tabela
  ganhou superfície, padding e `gap` próprios, inclusive no mobile.
- **Continuação do shell responsivo:** a barra superior agora permanece visível
  durante a rolagem e lida com nomes longos de empresa sem quebrar o layout. A
  navegação móvel passou a usar exatamente a quantidade de itens liberados para
  o perfil, sem coluna vazia, e respeita a área segura inferior do aparelho.
  Estados de foco também cobrem `select` e `textarea`.
- **Continuação de estados de erro:** a tela global e as listagens usam agora o
  mesmo estado orientativo, com sinal visual de atenção, mensagem contextual e
  ação para nova tentativa. Produtos, Clientes e Fornecedores também passaram a
  renderizar esse estado dentro de `page-content`, corrigindo o desalinhamento
  que ocorria quando uma dessas rotas falhava.
- **Auditoria e decisão de componentes:** a revisão final eliminou o utilitário
  visual avulso que restava na paginação e deu tratamento tokenizado ao aviso de
  custo calculado. A decisão para o MVP é **não migrar para shadcn/ui agora**:
  a base atual já oferece campos, botões, cards, tabelas, estados, responsividade
  e ícones consistentes sobre os tokens oficiais. Introduzir shadcn neste ponto
  duplicaria componentes e CSS, sem cobrir uma lacuna funcional. Reavaliar quando
  houver necessidade concreta de primitives complexas ainda ausentes (por exemplo,
  dialog acessível, combobox com busca ou menu contextual).
- **Motivo da continuação:** reduzir a sensação de tabelas e formulários soltos,
  deixando os pontos de entrada, revisão e confirmação com a mesma hierarquia.
- **Pendências / retomada:** refinar as páginas operacionais restantes e rodar a
  validação final de lint/build do pacote visual. O lint passou nesta rodada; a
  nova execução do build Turbopack deixou de estar bloqueada, mas falha antes da
  checagem do projeto ao tentar criar o processo/porta auxiliar em
  `fontmono_*.module.css` (`Operation not permitted`). A repetição fora do
  isolamento teve o mesmo resultado; não é erro de lint/TypeScript das telas e
  nenhum arquivo temporário foi removido à força.

### Bloco 9 — Interface web de importação e conciliação

- **Período:** 2026-08-06
- **Status:** concluído
- **Objetivo:** concluir a Fase 6 na web sobre os contratos de importação já
  existentes: baixar modelo CSV, enviar para simulação, revisar erros e
  duplicidades, confirmar com idempotência, consultar o relatório conciliado e
  reverter antes do aceite final.
- **Modificado:** criada a rota `/importacoes`, o BFF autenticado em
  `/api/imports/[...path]` e a entrada de navegação, todos condicionados à
  permissão `manage_imports`. A interface baixa o modelo CSV, envia o arquivo
  multipart para preview, exibe erros por linha, obriga uma decisão explícita
  para cada duplicidade e confirma com `Idempotency-Key`. Também apresenta o
  histórico, o relatório com contagens/reconciliação e a reversão soft com
  confirmação explícita. Foram incluídos `loading.tsx` e `error.tsx` próprios.
- **Motivo:** o Bloco 8 concluiu a API de importação, mas o requisito de negócio
  BR §10.19 começa pela operação guiada do usuário e ainda não existe uma tela
  web para executar a migração das planilhas da MAFA Store.
- **Validação:** `pnpm --filter @erp-mafa/web lint` passou; `pnpm test` passou
  (12 suítes, 44 testes); `pnpm --filter @erp-mafa/web build` passou com
  Next.js 16.3 e Turbopack; `git diff --check` passou. A API não foi alterada:
  a interface consome exclusivamente os endpoints de imports já cobertos pelo
  Bloco 8 (14 suítes de integração, 79 testes, incluindo permissões e tenant).
- **Pendências / retomada:** exportação básica (BR §10.20) não faz parte deste
  bloco; deverá ser planejada separadamente após a interface de importação.

### Bloco 10 — Permissão de importação para administração

- **Período:** 2026-08-06
- **Status:** concluído
- **Objetivo:** permitir que proprietários e administradores executem a
  migração assistida de dados da empresa.
- **Modificado:** a role `admin` passou a receber `manage_imports` no seed de
  roles; a role `owner` já possuía a mesma permissão.
- **Motivo:** decisão explícita do responsável pelo projeto. A implementação
  anterior restringia a permissão ao proprietário, enquanto o registro do
  Bloco 8 já descrevia owner/admin.
- **Validação:** `pnpm --filter @erp-mafa/api exec tsx prisma/seed.ts` foi
  executado com sucesso contra o banco local, atualizando as roles existentes
  via `upsert`.
- **Pendências / retomada:** usuários já autenticados devem renovar a sessão
  (sair e entrar novamente) para que o JWT passe a carregar a nova permissão.

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
- **Commits:** `45da669` (schema/migration/permissão/exports de módulo/fix de lint),
  `dc1094b` (módulo imports completo), `b012510` (testes de integração), `e5de44e` (docs).

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
- **Commits:** `f06bec6` (fix isolado do proxy financeiro); a correção do
  ajuste de estoque e das cores de status foi incluída dentro do commit
  `8ca6634` do próprio Bloco 6 (arquivos compartilhados).

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

*(Atualizado no Bloco 8 — os itens de RLS/auditoria/build listados nas versões anteriores
deste documento foram concluídos nos Blocos 3, 4, 5 e 7, e removidos daqui. Ver README.md,
seção "Débito técnico conhecido", para a lista completa e sempre mais atual — este bloco só
resume o que é relevante para quem for continuar o trabalho.)*

- **Auditoria cobre só uma parte dos eventos de BR §10.23**: ajuste de estoque, recebimento de
  compra, confirmação de venda, pagamento/cancelamento de contas a receber/pagar,
  transferências, reprecificação de produto e confirmação/reversão de importação. Faltam
  login, criação/edição de usuário, mudança de permissão, edição de campos cadastrais de
  produto, desconto, mudança de vencimento, export, mudança de configuração e estorno fora do
  fluxo de importação. Consulta já existe (`GET /audit`, permissão `view_audit`).
- **Edição em Financeiro não implementada** (contas, formas de pagamento,
  despesas e vencimentos). O Bloco 22 concluiu criação, consulta, baixas,
  cancelamentos aplicáveis, transferências e inativação; alteração auditada de
  dados existentes ainda depende de contrato. Estoque/Compras/Vendas são
  imutáveis por design (corrigir é lançar ajuste/estorno novo, nunca editar),
  então não entram nesse débito.
- **Paginação/busca só em Produtos, Clientes e Fornecedores.** `GET` desses três cadastros
  aceita array completo sem `page` por compatibilidade temporária com os seletores usados em
  Compras/Vendas/Estoque — remover esse modo legado exige revisar esses três consumidores
  juntos, não isoladamente. Contas a receber/pagar receberam paginação local no
  Bloco 22; Compras, Vendas, Estoque, Despesas e Fluxo de caixa ainda não possuem
  paginação de API (mitigado por filtros e paginação local onde existe).
- **Sem testes automatizados no `apps/web`** — nenhum framework de teste (vitest/playwright)
  configurado; toda a cobertura de teste do projeto está em `apps/api`.
- **Fase 6 (Imports, Blocos 8 e 21) cobre cadastros + saldos em aberto**:
  compras/vendas históricas ficam de fora (já opcionais na BR); não há mapeamento
  livre de colunas (cabeçalho fixo); o casamento de duplicidade de produto é
  exato, sem fuzzy matching; o processamento continua síncrono, sem fila
  (BullMQ/Redis previsto desde o stack inicial, nunca implementado); exportação
  (BR §10.20) não foi implementada. A interface Web operacional foi concluída no
  Bloco 21.

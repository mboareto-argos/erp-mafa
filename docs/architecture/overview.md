# Documentação Técnica — ERP Simplificado (MAFA Store → Multiempresa)

**Baseado em:** Documento de Negócio v1.0 · Design System v1.0 · Wireframes navegáveis (HTML)
**Versão deste documento:** 1.0
**Status:** Fundação técnica inicial — pronto para orientar o início da implementação
**Público-alvo:** arquitetos, desenvolvedores, QA, agentes de IA

---

## 1. Objetivo deste documento

Este documento traduz o Documento de Negócio (visão, módulos, regras, seção 15 — requisitos para uso por agentes de IA) em decisões técnicas concretas: stack, arquitetura, modelo de domínio, modelo de dados, estratégia multiempresa, segurança, convenções de API e estratégia de testes.

Ele cumpre diretamente o que a seção 31 do Documento de Negócio pede como próximos documentos (modelo de domínio, modelo de dados, arquitetura de software, arquitetura de infraestrutura, especificação de API, estratégia de segurança, estratégia multiempresa, estratégia de testes) — consolidados aqui num único documento de fundação técnica, para depois serem desmembrados em arquivos próprios conforme a seção 15.4.

Convenção de nomenclatura das regras técnicas deste documento: **TA-ÁREA-NÚMERO** (Technical Architecture), no mesmo espírito das regras `RN-` do Documento de Negócio e `DS-` do Design System — pensado para ser referenciável por humanos e por agentes de IA.

---

## 2. Stack tecnológico proposto

**Este documento fecha a decisão de stack que o Documento de Negócio deixou em aberto** (seção 1: "frameworks... deverão ser registradas posteriormente na documentação técnica"). A proposta abaixo segue o padrão já usado em outros projetos da ArgosDev (monorepo Turborepo, Next.js, Node, Postgres/Prisma), por consistência de ferramental entre projetos — pode ser revisitada em um ADR próprio se houver motivo técnico específico.

| Camada | Escolha proposta | Justificativa |
|---|---|---|
| Monorepo | Turborepo | Já validado em outro projeto da casa; permite compartilhar tipos e componentes entre web e futuras apps |
| Web app (ERP) | Next.js (App Router) + TypeScript | SSR/SSG onde fizer sentido, boa DX, ecossistema React alinhado ao design system em HTML/CSS já produzido |
| Estilização | Tailwind CSS, com tokens do Design System (seção 4) mapeados para o `theme` do Tailwind | Tradução direta dos tokens já definidos (cor, espaçamento, tipografia, raio) |
| Componentes de UI | shadcn/ui como base (headless + acessível), customizado com os tokens da marca | Evita reinventar componentes acessíveis (combobox, modal, tooltip) |
| Backend | Node.js + TypeScript, framework Nest.js (estrutura modular nativa, alinhada aos "Domínios e limites" da seção 16 do Documento de Negócio) | Nest.js mapeia natural para módulos = domínios (Sales, Inventory, Receivables etc.), com DI e contratos explícitos (exigência da seção 15.3) |
| Banco de dados | PostgreSQL | Tipos `numeric`/`decimal` nativos (exigência da regra de integridade nº 4 do Documento de Negócio — nunca usar ponto flutuante binário para dinheiro), forte suporte a transações e constraints |
| ORM | Prisma | Já em uso em outro projeto da casa; migrations versionadas nativamente (requisito de manutenibilidade, seção 14.7) |
| Autenticação | JWT de sessão (access + refresh token) emitido pelo backend, ou Auth.js se o time preferir sessão gerenciada no Next.js | A decidir em ADR-0002 conforme necessidade de SSO futura |
| Filas / processamento assíncrono | BullMQ sobre Redis (para importação de planilhas, geração de relatórios pesados, notificações) | Requisito explícito da seção 14.2/14.4: "processamentos pesados assíncronos" |
| Armazenamento de arquivos | Object storage compatível S3 (ex.: Cloudflare R2 ou AWS S3) | Anexos, imagens de produto, planilhas importadas — nunca no banco |
| Observabilidade | Logs estruturados (pino) + correlação por request-id + Sentry (erros) + métricas básicas (Prometheus/OpenTelemetry quando o volume justificar) | Requisito da seção 14.5 |
| Mobile (futuro) | Expo React Native, reaproveitando o padrão já usado em outro projeto | Fora do escopo do MVP web, mas a escolha de stack já é compatível caso o produto vá para app nativo |

**Regra TA-STACK-001:** qualquer desvio desta stack (troca de framework, banco, ORM) deve ser registrado como um novo ADR (seção 12), nunca decidido silenciosamente durante a implementação — alinhado à exigência da seção 15.3 do Documento de Negócio ("registrar decisões arquiteturais").

---

## 3. Arquitetura geral

### 3.1 Estilo arquitetural

**Monólito modular**, exatamente como sugerido na seção 16 do Documento de Negócio. Não é um conjunto de microsserviços — é uma única aplicação backend organizada em módulos de domínio com fronteiras explícitas, o que permite:

- velocidade de desenvolvimento inicial (equipe pequena, um único deploy);
- fronteiras de domínio já corretas desde o início, o que **facilita** (não impede) uma extração futura de módulos para serviços separados, se e quando o volume justificar (seção 14.4 — "separação futura de módulos").

### 3.2 Diagrama lógico

```
                         ┌─────────────────────────────┐
                         │      Web app (Next.js)       │
                         │  Dashboard · Vendas · Estoque │
                         │  Financeiro · Configurações   │
                         └──────────────┬────────────────┘
                                        │ HTTPS / REST (JSON)
                         ┌──────────────▼────────────────┐
                         │        API (Nest.js)           │
                         │  ┌───────────────────────────┐  │
                         │  │  Middleware: Auth · Tenant  │  │
                         │  │  Resolution · Rate Limit    │  │
                         │  └──────────────┬────────────┘  │
                         │  ┌──────────────▼────────────┐  │
                         │  │   Módulos de domínio        │  │
                         │  │  Identity · Tenancy         │  │
                         │  │  Catalog · Inventory        │  │
                         │  │  Purchasing · Sales         │  │
                         │  │  Customers · Suppliers      │  │
                         │  │  Payments · Receivables     │  │
                         │  │  Payables · CashFlow        │  │
                         │  │  Reporting · Notifications  │  │
                         │  │  Imports · Audit            │  │
                         │  └──────────────┬────────────┘  │
                         └──────────────────┼───────────────┘
                       ┌──────────────┬─────┴───────┬──────────────┐
                       ▼              ▼              ▼              ▼
                 ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
                 │ PostgreSQL │  │   Redis    │  │  Object    │  │  Provedor  │
                 │ (dados)    │  │ (filas/    │  │  Storage   │  │  de e-mail │
                 │            │  │  cache)    │  │  (arquivos)│  │  / push    │
                 └───────────┘  └───────────┘  └───────────┘  └───────────┘
```

### 3.3 Comunicação entre módulos internos

Reflete diretamente a "Regra de integração entre módulos" da seção 16 do Documento de Negócio: um módulo nunca escreve diretamente nas tabelas internas de outro.

**Regra TA-ARCH-001:** todo módulo expõe apenas **serviços de aplicação** (casos de uso) como contrato público. Outro módulo só pode chamar esse serviço, nunca o repositório/ORM interno de outro módulo.

**Regra TA-ARCH-002 — Comunicação por eventos de domínio internos.** Efeitos colaterais entre módulos (ex.: venda confirmada → baixar estoque → criar conta a receber) são disparados por eventos de domínio (seção 18 do Documento de Negócio), publicados num event emitter in-process no MVP (ex.: `EventEmitter2` do Nest.js), evoluindo para uma fila (BullMQ) quando o efeito puder ser assíncrono (ex.: notificações, relatórios).

**Regra TA-ARCH-003 — Consistência transacional primeiro, eventual depois.** Efeitos que precisam ser atômicos com a operação principal (ex.: venda confirmada **e** estoque baixado **e** conta a receber criada) acontecem na mesma transação de banco de dados (requisito de integridade nº 6 e 7 do Documento de Negócio). Só efeitos que podem tolerar um pequeno atraso (notificação, atualização de relatório agregado) usam fila assíncrona.

---

## 4. Estrutura de repositório (monorepo)

```
erp-mafa/
├── apps/
│   ├── web/                 # Next.js — a UI descrita no design system e nos wireframes
│   └── api/                 # Nest.js — módulos de domínio
├── packages/
│   ├── design-tokens/       # tokens do design system (cor, tipografia, espaçamento) em JSON,
│   │                        #   consumidos por apps/web (Tailwind theme)
│   ├── ui/                  # componentes compartilhados (se web e futuro app mobile dividirem UI)
│   ├── shared-types/        # tipos TypeScript compartilhados entre api e web (DTOs, enums de status)
│   └── config/              # eslint, tsconfig, prettier compartilhados
├── docs/
│   ├── product/
│   │   ├── business-requirements.md      # o Documento de Negócio
│   │   ├── glossary.md                   # extraído da seção 8 do Documento de Negócio
│   │   ├── design-system.md              # o Design System v1.0
│   │   ├── wireframes/                   # o HTML navegável + prints
│   │   └── user-flows.md                 # extraído da seção 19 do Documento de Negócio
│   ├── architecture/
│   │   ├── overview.md                   # este documento (ou sua versão desmembrada)
│   │   ├── domain-model.md               # seção 6 deste documento
│   │   ├── data-model.md                 # seção 7 deste documento
│   │   ├── security.md                   # seção 9 deste documento
│   │   ├── multitenancy.md               # seção 8 deste documento
│   │   └── decisions/                    # ADRs (seção 12)
│   │       └── 0001-stack-inicial.md
│   ├── api/
│   │   └── openapi.yaml                  # gerado a partir dos controllers do Nest.js
│   ├── data/
│   │   └── data-dictionary.md
│   ├── testing/
│   │   └── test-strategy.md              # seção 11 deste documento
│   └── operations/
│       └── runbook.md
├── AGENTS.md                             # ver seção 13 deste documento
├── CONTRIBUTING.md
└── README.md
```

Essa estrutura implementa diretamente a lista de "Arquivos recomendados no repositório" da seção 15.4 do Documento de Negócio, adaptada ao monorepo Turborepo.

---

## 5. Módulos de domínio — responsabilidades e contratos

Expande a lista de módulos da seção 16 do Documento de Negócio com responsabilidade, o que cada módulo **nunca** faz, e os principais eventos que publica/consome.

| Módulo | Responsabilidade | Nunca faz | Publica (exemplos) | Consome (exemplos) |
|---|---|---|---|---|
| **Identity** | Usuários, autenticação, sessões, convites | Regras de negócio de venda/estoque | `UserInvited` | — |
| **Tenancy** | Empresas, vínculo usuário-empresa, planos | Dados operacionais da empresa | `CompanyCreated` | — |
| **Catalog** | Produtos, variações, categorias, preços | Saldo de estoque real | `ProductCreated`, `ProductActivated` | — |
| **Inventory** | Saldo, movimentações, reservas, inventário físico | Criar contas financeiras | `StockAdded`, `StockRemoved`, `StockReserved`, `StockAdjusted`, `LowStockDetected` | `SaleConfirmed`, `PurchaseReceived` |
| **Purchasing** | Compras, recebimento, rateio de custo | Baixar estoque diretamente (delega a Inventory) | `PurchaseCreated`, `PurchaseReceived` | — |
| **Sales** | Vendas, itens, descontos, trocas/devoluções | Calcular saldo de caixa | `SaleCreated`, `SaleConfirmed`, `SaleCancelled`, `SaleReturned` | `StockReserved` (validação de disponibilidade) |
| **Customers** / **Suppliers** | Cadastro e histórico de clientes/fornecedores | Regras financeiras | — | `SaleConfirmed`, `PurchaseCreated` |
| **Payments** | Formas de pagamento, taxas, adquirentes | Contas a pagar/receber (delega) | — | — |
| **Receivables** / **Payables** | Parcelas, vencimentos, baixa | Movimentar estoque | `ReceivableCreated`, `ReceivablePaid`, `ReceivableOverdue`, `PayableCreated`, `PayablePaid` | `SaleConfirmed`, `PurchaseReceived` |
| **CashFlow** | Consolidação de entradas/saídas realizadas | Criar parcelas | `FinancialTransactionCreated` | `ReceivablePaid`, `PayablePaid`, `ExpenseCreated` |
| **Reporting** | Indicadores, DRE, exportações | Alterar dados operacionais (somente leitura) | — | todos os eventos operacionais |
| **Notifications** | Alertas (estoque baixo, conta vencendo) | Regras de negócio de origem | — | `LowStockDetected`, `ReceivableOverdue`, `PayableOverdue` |
| **Imports** | Importação assistida de planilhas | Validar regra de negócio final (delega aos módulos) | `ImportCompleted`, `ImportFailed` | — |
| **Audit** | Trilha de auditoria de eventos sensíveis | Bloquear a operação de origem | — | todos os eventos de domínio |

**Regra TA-MOD-001:** todo módulo novo deve ser adicionado a esta tabela antes de ser implementado — inclusive por agentes de IA (atende à exigência da seção 15.1 do Documento de Negócio: cada módulo técnico precisa de objetivo, limites, entidades, eventos documentados).

---

## 6. Modelo de domínio (detalha a seção 17 do Documento de Negócio)

Cada entidade abaixo lista os campos essenciais para a modelagem inicial. Campos de auditoria padrão (`id`, `company_id`, `created_at`, `updated_at`, `created_by`, `deleted_at`) são implícitos em toda entidade operacional e omitidos das listas abaixo por brevidade — ver regra TA-DATA-001.

### 6.1 Identidade e empresa

- **Company** — `name`, `document` (CNPJ/CPF), `segment`, `plan`, `brand_accent_color`, `status`
- **User** — `name`, `email`, `password_hash`, `status`
- **Membership** — vincula `User` a `Company` com um `Role`; `status` (ativo/convidado/removido)
- **Role** — `name` (proprietário, administrador, vendedor, estoquista, financeiro, visualizador), `permissions[]`
- **Invitation** — `email`, `company_id`, `role_id`, `token`, `expires_at`

### 6.2 Catálogo

- **Product** — `sku`, `name`, `category_id`, `brand_id`, `unit`, `status`, `aliases[]` (RN-IMP-001)
- **ProductVariant** — `product_id`, `attributes` (ex.: tamanho/volume), `sku_variant`
- **Category**, **Brand**, **Tag** — estrutura simples de classificação
- **ProductPrice** — `product_id`, `cost_price` (calculado, nunca editável direto), `sale_price`, `margin`, `effective_from`, histórico (RN-PRC-003)

### 6.3 Estoque

- **StockBalance** — `product_variant_id`, `quantity_available`, `quantity_reserved`, `quantity_in_transit` (materializado, sempre reconciliável — regra de integridade nº 11)
- **StockMovement** — `product_variant_id`, `type` (entrada/saída/ajuste/devolução), `quantity`, `origin_type`, `origin_id` (toda movimentação tem origem — regra nº 12), `unit_cost`
- **StockReservation** — `sale_id`, `product_variant_id`, `quantity`, `status`
- **InventoryCount** / **InventoryCountItem** — inventário físico (seção 10.8 do Documento de Negócio)
- **StockAdjustment** — `reason`, `requires_approval`, `approved_by`

### 6.4 Compras

- **Supplier** — dados cadastrais + canal de origem (RN-PUR-017)
- **Purchase** — `supplier_id`, `status`, `currency`, `exchange_rate`, `exchange_rate_date` (RN-PUR-016)
- **PurchaseItem** — `purchase_id`, `product_variant_id`, `quantity`, `unit_cost_origin_currency`
- **PurchaseReceipt** / **PurchaseReceiptItem** — recebimento parcial ou total
- **PurchaseCostAllocation** — rateio de frete/custos adicionais entre itens (seção 10.6)

### 6.5 Vendas

- **Customer** — dados cadastrais, histórico de compras
- **Sale** — `customer_id`, `channel`, `status`, `subtotal`, `discount`, `total`, `cmv_calculated`, `gross_profit_calculated`
- **SaleItem** — `sale_id`, `product_variant_id`, `quantity`, `unit_price`, `unit_cost_at_sale` (custo **preservado** no item — regra "CMV mensal manual" da seção 34.3)
- **SaleDiscount**, **SaleReturn**, **SaleReturnItem**
- **SalesChannel** — WhatsApp, Instagram, presencial, marketplace

### 6.6 Financeiro

- **PaymentMethod** — PIX, dinheiro, débito, crédito, com `fee_rate`, `acquirer`, `settlement_days`
- **FinancialAccount** — conta bancária/carteira de destino
- **Receivable** / **ReceivablePayment** — parcela e baixa
- **Payable** / **PayablePayment** — conta a pagar e baixa
- **Expense** — categoria, competência vs. caixa
- **FinancialTransaction** — lançamento realizado de caixa (nunca editável após criado — regra nº 10)
- **Transfer**, **Recurrence**

### 6.7 Relatórios e operação

- **Notification**, **ImportJob** / **ImportRow**, **ExportJob**, **AuditLog**, **Attachment**

**Regra TA-DOMAIN-001:** todo valor monetário no modelo de domínio usa `Decimal`/`numeric`, nunca `float`/`double` (regra de integridade nº 4 do Documento de Negócio) — vale tanto para o schema de banco quanto para os DTOs de API e para os tipos TypeScript compartilhados (`packages/shared-types`, usando uma lib como `decimal.js` no lado da aplicação).

---

## 7. Modelo de dados

### 7.1 Estratégia de multiempresa no banco

**Decisão: banco compartilhado, schema compartilhado, isolamento por coluna `company_id`** (não schema-per-tenant, não banco-por-tenant) — ver justificativa detalhada na seção 8.

**Regra TA-DATA-001:** toda tabela operacional tem, obrigatoriamente:

```sql
id            uuid primary key default gen_random_uuid(),
company_id    uuid not null references companies(id),
created_at    timestamptz not null default now(),
updated_at    timestamptz not null default now(),
created_by    uuid references users(id),
deleted_at    timestamptz null            -- exclusão lógica (regra de integridade nº 17)
```

**Regra TA-DATA-002:** toda tabela operacional tem um índice composto iniciando por `company_id` (ex.: `(company_id, status)`, `(company_id, sku)`) — toda consulta de aplicação deve filtrar por `company_id` primeiro, nunca depender apenas do índice de PK.

**Regra TA-DATA-003:** toda constraint de unicidade de negócio (ex.: SKU único, e-mail único por usuário dentro de uma empresa) é composta com `company_id` — nunca global — exceto entidades verdadeiramente globais (`users.email` de login, que é global por design de autenticação).

### 7.2 Exemplo de DDL — núcleo de vendas e estoque (ilustrativo, não exaustivo)

```sql
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  segment text,
  brand_accent_color text default '#C49A28',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  sku text not null,
  name text not null,
  category_id uuid references categories(id),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, sku)
);

create table stock_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  product_variant_id uuid not null references product_variants(id),
  quantity_available numeric(14,3) not null default 0,
  quantity_reserved numeric(14,3) not null default 0,
  quantity_in_transit numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  unique (company_id, product_variant_id)
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  product_variant_id uuid not null references product_variants(id),
  type text not null check (type in ('in','out','adjustment','return')),
  quantity numeric(14,3) not null check (quantity <> 0),
  unit_cost numeric(14,4),
  origin_type text not null,           -- 'purchase' | 'sale' | 'adjustment' | 'return'
  origin_id uuid not null,
  created_at timestamptz not null default now()
);

create table sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  customer_id uuid references customers(id),
  channel text not null,
  status text not null default 'draft',   -- draft | confirmed | cancelled | returned
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  cmv_calculated numeric(14,2),
  gross_profit_calculated numeric(14,2),
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  sale_id uuid not null references sales(id),
  product_variant_id uuid not null references product_variants(id),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null,
  unit_cost_at_sale numeric(14,4) not null   -- custo preservado no momento da venda
);

create table receivables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  origin_type text not null,        -- 'sale'
  origin_id uuid not null,
  customer_id uuid references customers(id),
  due_date date not null,
  amount numeric(14,2) not null,
  status text not null default 'open',   -- open | paid | overdue | cancelled
  created_at timestamptz not null default now()
);
```

**Regra TA-DATA-004:** este DDL é ilustrativo — a modelagem final e completa (todas as ~45 entidades da seção 6) deve ser produzida em `docs/data/data-dictionary.md` e nas migrations do Prisma antes do início da implementação de cada módulo, nunca inferida ad-hoc durante o código.

### 7.3 Row-Level Security (defesa em profundidade)

**Regra TA-DATA-005:** além do filtro por `company_id` na camada de aplicação (Prisma middleware/interceptor injetando `company_id` em toda query), o banco também ativa **Row-Level Security (RLS)** do PostgreSQL nas tabelas operacionais, usando uma variável de sessão (`app.current_company_id`) setada no início de cada requisição. Isso cumpre o critério de aceite global de Isolamento da seção 20 do Documento de Negócio ("Nenhum endpoint, consulta ou exportação poderá retornar dados de outra empresa") com uma segunda camada de proteção — mesmo um erro de código na camada de aplicação não vaza dados entre empresas.

---

## 8. Estratégia multiempresa (SaaS)

Detalha o princípio "Isolamento de dados" (seção 4.3) e a Fase 7 do roadmap do Documento de Negócio.

### 8.1 Modelo escolhido: banco compartilhado com `company_id`

| Alternativa | Por que não foi escolhida agora |
|---|---|
| Banco por empresa | Custo operacional alto para o volume esperado (pequenos vendedores); migrations precisam rodar N vezes; inviável no MVP com 1 empresa |
| Schema por empresa | Complica connection pooling e migrations em escala; ganho de isolamento marginal frente ao RLS (7.3) |
| **Banco compartilhado + `company_id` + RLS** | Mais simples de operar com poucas empresas, escala bem até uma faixa alta de tenants, e o RLS (7.3) fecha o principal risco desse modelo (vazamento entre empresas) |

**Regra TA-TENANT-001:** a decisão acima é revisitável — se um cliente futuro exigir isolamento físico total (ex.: por contrato ou regulação), o modelo permite migrar empresas específicas para um banco dedicado sem redesenhar a aplicação, desde que o `company_id` já esteja em todas as tabelas desde o início.

### 8.2 Resolução do tenant por requisição

**Regra TA-TENANT-002:** toda requisição autenticada resolve `company_id` a partir do **vínculo ativo do usuário** (tabela `Membership`), nunca a partir de um parâmetro de URL ou corpo da requisição não verificado — evita a regra de integridade nº 18 do Documento de Negócio ("identificadores externos não deverão ser confiados sem validação de empresa"). Um middleware de "Tenant Resolution" roda antes de qualquer módulo de negócio e injeta o `company_id` no contexto da requisição.

**Regra TA-TENANT-003:** usuários com acesso a mais de uma empresa (ex.: o próprio Matheus/ArgosDev administrando múltiplos tenants) selecionam a empresa ativa explicitamente (seletor de empresa da barra superior, ver Design System DS-NAV-002); essa seleção define qual `Membership` está ativo na sessão — nunca duas empresas ativas ao mesmo tempo.

### 8.3 Testes obrigatórios de isolamento

**Regra TA-TENANT-004:** todo módulo de domínio crítico (Sales, Inventory, Receivables, Payables, CashFlow) tem, na sua suíte de testes, ao menos um cenário que cria dados em duas empresas diferentes e verifica que uma não enxerga a outra — atende diretamente ao critério de aceite global "Todo teste de módulo crítico deverá incluir cenário multiempresa" (seção 20 do Documento de Negócio).

---

## 9. Segurança e autorização

### 9.1 Autenticação

- Login por e-mail/senha (hash com Argon2id) no MVP; estrutura pronta para SSO/OAuth futuramente.
- Sessão via access token (JWT curto, ~15 min) + refresh token (rotativo, revogável) — atende ao requisito "sessões revogáveis" (seção 14.1).
- Limitação de tentativas de login (rate limiting) por IP e por conta.

### 9.2 Autorização — RBAC mapeado aos perfis do Documento de Negócio

| Perfil (seção 9 do Doc. de Negócio) | Papel técnico (`Role.name`) | Observação de implementação |
|---|---|---|
| Proprietário | `owner` | Único que pode gerenciar assinatura/billing e remover outros administradores |
| Administrador | `admin` | Todas as permissões operacionais; configurações sensíveis marcadas `owner_only` ficam de fora |
| Vendedor | `sales` | Sem `permission:view_cost`, `permission:view_profit`, `permission:manage_expenses` |
| Estoquista | `inventory` | Sem permissões financeiras; `permission:adjust_stock` exige `requires_approval` conforme RN de estoque |
| Financeiro | `finance` | Sem `permission:manage_catalog` além de leitura |
| Visualizador | `viewer` | Réplica somente-leitura de qualquer papel acima, nunca grava |

**Regra TA-SEC-001:** a checagem de permissão acontece **sempre no backend**, em um guard/decorator por endpoint (ex.: `@RequirePermission('view_profit')`), nunca apenas no frontend — implementa diretamente a regra de negócio 9.7 do Documento de Negócio ("ações sensíveis deverão ser autorizadas no backend, independentemente das restrições visuais do frontend") e a regra de integridade nº 20 ("o frontend não deverá ser a única camada de validação").

**Regra TA-SEC-002:** o frontend consulta a lista de permissões do usuário logado uma vez (no login/refresh) e usa isso só para **decidir o que renderizar** (implementando DS-PERM-001 do Design System — ocultar, não desabilitar); a fonte de verdade da permissão nunca é o estado do frontend.

### 9.3 Outros requisitos de segurança (mapeados da seção 14.1)

- Validação de entrada no backend com schema (ex.: `zod`) em todo endpoint — nunca confiar em validação client-side.
- Segredos (chaves de API, credenciais de banco) fora do código-fonte, via variáveis de ambiente/gerenciador de segredos.
- Backups automáticos diários do banco, com teste periódico de restauração.
- Logs de segurança para login, troca de senha, mudança de permissão e exportação de dados.
- Conformidade com LGPD: exportação e exclusão/anonimização de dados pessoais sob pedido (Customer, User).

---

## 10. Convenções de API

### 10.1 Estilo

- REST sobre JSON, versionado por prefixo de URL (`/api/v1/...`).
- Recursos no plural (`/sales`, `/products`, `/receivables`), ações não-CRUD como sub-rota de verbo quando necessário (`/sales/:id/confirm`, `/purchases/:id/receive`).
- Paginação padrão em toda lista (`?page=&pageSize=`), nunca retorno de lista completa sem limite (requisito de desempenho da seção 14.2).

### 10.2 Formato de erro padrão

```json
{
  "error": {
    "code": "STOCK_INSUFFICIENT",
    "message": "Quantidade solicitada maior que o estoque disponível.",
    "field": "items[0].quantity",
    "details": { "available": 6, "requested": 10 }
  }
}
```

**Regra TA-API-001:** toda mensagem de erro de negócio tem um `code` estável (para o frontend tratar programaticamente) e uma `message` em português, no tom de linguagem da seção 11 do Design System — nunca uma mensagem técnica crua (stack trace, erro de SQL) exposta ao usuário final.

### 10.3 Idempotência

**Regra TA-API-002:** todo endpoint que cria um efeito financeiro ou de estoque (confirmar venda, registrar recebimento, receber compra) aceita um cabeçalho `Idempotency-Key`, para que uma repetição de requisição (ex.: duplo toque no celular com conexão instável) nunca duplique o efeito — implementa a regra de integridade nº 8 do Documento de Negócio.

---

## 11. Estratégia de testes

| Nível | O que cobre | Ferramenta sugerida |
|---|---|---|
| Unitário | Regras de cálculo puras (CMV, rateio de custo, cálculo de parcelas, margem) | Vitest/Jest |
| Integração de módulo | Casos de uso completos de um módulo contra banco real (ex.: "confirmar venda baixa estoque e cria parcela") | Jest + banco de teste (container Postgres) |
| Contrato de API | Cada endpoint contra o schema definido em `openapi.yaml` | Supertest / testes de contrato |
| Multiempresa (obrigatório) | Cenário de duas empresas por módulo crítico (TA-TENANT-004) | Igual ao de integração |
| Ponta a ponta (E2E) | Fluxos críticos da seção 19 do Documento de Negócio (venda imediata, venda a prazo, compra e recebimento) navegando a UI real | Playwright |
| Migração / importação | Conciliação de planilhas importadas contra os critérios de aceite da seção 34.8 do Documento de Negócio | Scripts de teste com fixtures reais (anonimizados) da MAFA Store |

**Regra TA-TEST-001:** nenhuma regra de cálculo financeiro (CMV, lucro, rateio, DRE) é considerada implementada sem teste unitário cobrindo o exemplo numérico correspondente já presente no Documento de Negócio (seção 10.6 "Exemplo de cálculo", seção 11 "Regras financeiras consolidadas").

**Regra TA-TEST-002:** testes são escritos antes ou junto da implementação de cada história (exigência da seção 15.3 do Documento de Negócio), nunca depois — inclusive quando a implementação é feita por um agente de IA.

---

## 12. Registro de decisões arquiteturais (ADRs)

Formato padrão para `docs/architecture/decisions/NNNN-titulo.md`:

```markdown
# ADR-0001 — Stack inicial do projeto

## Status
Aceito

## Contexto
O Documento de Negócio não fecha stack técnica (por escolha deliberada) e pede que essa
decisão seja registrada na documentação técnica (seção 1 e 15.3).

## Decisão
Turborepo + Next.js + Nest.js + PostgreSQL + Prisma, conforme seção 2 deste documento,
por consistência com o ferramental já validado em outro projeto da ArgosDev.

## Consequências
- Equipe já tem familiaridade com o stack, reduz tempo de setup.
- Nest.js impõe estrutura modular que mapeia 1:1 com os domínios da seção 16 do
  Documento de Negócio.
- Troca futura de qualquer peça do stack exige um novo ADR, não uma decisão silenciosa.

## Alternativas consideradas
- Django/Python: descartado por divergir do padrão de outros projetos da casa.
- Microsserviços desde o início: descartado — complexidade operacional desnecessária
  para o estágio atual do produto (seção 3.1 deste documento).
```

**Regra TA-ADR-001:** toda decisão que altere stack, modelo de tenancy, estratégia de autenticação ou modelo de dados-chave gera um novo ADR numerado sequencialmente — nunca uma edição silenciosa de um ADR anterior (histórico de decisão é valor de auditoria técnica, no mesmo espírito de RN-PRC-003 do Documento de Negócio para preço).

---

## 13. AGENTS.md — conteúdo recomendado

Este documento serve de fonte para o arquivo `AGENTS.md` do repositório (exigido pela seção 15.5 do Documento de Negócio). Estrutura recomendada:

```markdown
# AGENTS.md — ERP MAFA Store

## Visão resumida
ERP simplificado, piloto na MAFA Store, evoluindo para SaaS multiempresa.
Fonte de verdade de negócio: docs/product/business-requirements.md
Fonte de verdade visual: docs/product/design-system.md + docs/product/wireframes/
Fonte de verdade técnica: docs/architecture/overview.md (este documento)

## Comandos do projeto
- `pnpm install` — instala dependências do monorepo
- `pnpm dev` — sobe web + api em modo desenvolvimento
- `pnpm test` — roda toda a suíte de testes
- `pnpm test:tenant` — roda especificamente os cenários multiempresa (TA-TENANT-004)
- `pnpm db:migrate` — aplica migrations do Prisma

## Estrutura de pastas
Ver seção 4 de docs/architecture/overview.md

## Regras de negócio críticas — nunca violar
1. Todo registro operacional pertence a uma company_id (RN de integridade nº 1).
2. Valores monetários usam Decimal, nunca float (regra TA-DOMAIN-001).
3. Custo é sempre calculado, nunca digitado diretamente pelo usuário (DS-FORM-004).
4. Estoque é sempre derivado de movimentações, nunca editado direto (seção 34.3).
5. Cancelamento nunca apaga registro — sempre um novo estado (regra nº 9).
6. Toda ação sensível é autorizada no backend (TA-SEC-001) — nunca confiar só no frontend.

## Política multiempresa
Toda query, todo teste de módulo crítico, todo endpoint novo: ver seção 8 deste documento.
Nunca aceitar company_id vindo do cliente sem cruzar com o Membership do usuário autenticado.

## Convenções de teste
Ver seção 11 deste documento. Testes de cálculo financeiro usam os exemplos numéricos
já presentes no Documento de Negócio.

## Regras para migrations
Toda migration é versionada pelo Prisma, nunca uma alteração manual direto no banco de produção.

## Arquivos que não podem ser alterados sem aprovação humana explícita
- docs/product/business-requirements.md
- docs/product/design-system.md
- docs/architecture/decisions/*.md (ADRs existentes — só criação de novos, nunca edição)

## Definição de pronto
Ver seção 30 do Documento de Negócio + seção 14 deste documento (checklist de estados de UI).
```

**Regra TA-AGENTS-001:** qualquer agente de IA trabalhando neste repositório deve ler `AGENTS.md` antes de iniciar qualquer tarefa, e sinalizar (nunca assumir silenciosamente) quando uma tarefa pedida conflitar com uma regra listada nele — atende à exigência "não assumir comportamentos não documentados" e "interromper ou sinalizar em caso de regra contraditória" da seção 15.3 do Documento de Negócio.

---

## 14. Checklist de estados por endpoint/tela (definição técnica de pronto)

Complementa a "Definição de pronto" da seção 30 do Documento de Negócio e o checklist de estados de UI da seção 14 do Design System, do lado do backend/API:

- [ ] Endpoint valida entrada com schema explícito (nunca aceita payload não tipado).
- [ ] Endpoint checa permissão via guard (TA-SEC-001), nunca dentro da lógica de negócio solta.
- [ ] Endpoint filtra por `company_id` resolvido do contexto (TA-TENANT-002), nunca de parâmetro cru.
- [ ] Efeitos colaterais em outros módulos acontecem via evento de domínio ou serviço público (TA-ARCH-001/002).
- [ ] Operações que tocam mais de um módulo são transacionais (TA-ARCH-003).
- [ ] Erros retornam `code` + `message` no formato padrão (TA-API-001).
- [ ] Existe teste de integração cobrindo o caminho feliz e ao menos um caminho de erro.
- [ ] Existe teste multiempresa se o módulo for crítico (TA-TENANT-004).
- [ ] Auditoria registra o evento se a operação for sensível (seção 10.23 do Documento de Negócio).

---

## 15. Roadmap técnico (alinhado ao roadmap de negócio, seção 24 do Documento de Negócio)

| Fase de negócio | Entregável técnico correspondente |
|---|---|
| Fase 0 — Descoberta e migração da MAFA Store | Setup do monorepo, CI básico, schema inicial, script de importação das planilhas reais |
| Fase 1 — Fundação | Identity, Tenancy, Catalog — auth, empresas, produtos, categorias |
| Fase 2 — Estoque e compras | Inventory, Purchasing — movimentações, saldo materializado, recebimento |
| Fase 3 — Vendas | Sales, Customers, Payments — wizard de venda completo (alinhado ao HTML de wireframes) |
| Fase 4 — Financeiro | Receivables, Payables, CashFlow, Expenses |
| Fase 5 — Dashboard e relatórios | Reporting — indicadores, DRE automática, exportações |
| Fase 6 — Migração e validação | Imports com conciliação (critérios de aceite da seção 34.8) |
| Fase 7 — SaaS multiempresa | Ativação real do onboarding self-service de novas empresas, billing (TA-TENANT-001 revisitado se necessário) |
| Fase 8 — Expansão | Extração de módulos para serviços, se o volume justificar (ver 3.1) |

---

## 16. Rastreabilidade

Este documento não introduz regra de negócio nova — traduz em decisão técnica o que já está definido em:

- Seção 15 do Documento de Negócio (requisitos para agentes de IA) → Seções 4, 12, 13, 14 deste documento
- Seção 16 (domínios e limites) → Seção 5
- Seção 17 (entidades conceituais) → Seção 6
- Seção 18 (eventos de domínio) → Seções 5 e 3.3
- Seção 12 (regras de integridade) → Seções 6, 7, 9, 10
- Seção 9 (perfis de acesso) → Seção 9 deste documento
- Seção 20 (critérios de aceite globais) → Seções 7.3, 8.3, 14
- Design System DS-PERM-001/002/003 → Seção 9.2
- Design System DS-FORM-004 (calculado vs. digitado) → Seções 6.2, 13

Qualquer novo módulo, regra ou entidade adicionada ao Documento de Negócio deve gerar atualização correspondente neste documento — especialmente nas seções 5, 6 e 7.

---

*Fim do documento.*

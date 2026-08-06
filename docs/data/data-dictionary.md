# Dicionário de dados

> Este arquivo deve ser completado com o schema final (todas as ~45 entidades da seção 17 do
> Documento de Negócio / seção 6 de docs/architecture/overview.md) conforme cada módulo for
> implementado. O DDL ilustrativo inicial (núcleo de vendas e estoque) está em
> docs/architecture/overview.md, seção 7.2.

## Como manter este arquivo
- Toda migration do Prisma que criar ou alterar uma tabela deve atualizar a entrada
  correspondente aqui (nome da tabela, colunas, tipos, constraints, índices).
- Toda tabela operacional segue a regra TA-DATA-001 (campos de auditoria + `company_id`
  obrigatórios) — não repetir isso em cada entrada, só referenciar a regra.

## Módulos já documentados no nível conceitual (aguardando DDL completo)
- [x] Identity / Tenancy — schema + auth/RBAC implementados, ver abaixo
      (migrations `20260804140629_init`, `20260804143518_add_refresh_token`)
- [x] Catalog — schema + CRUD básico implementados, ver abaixo
      (migrations `20260804140629_init`, `20260804175603_add_inventory_purchasing` — `min_stock`)
- [x] Inventory — saldo/movimentação/ajuste implementados, ver abaixo
      (migration `20260804175603_add_inventory_purchasing`). Inventário físico (contagem,
      §10.8) ainda não implementado — decisão explícita, não bloqueia Sales.
- [x] Purchasing — compras/recebimento implementados, ver abaixo
      (migration `20260804175603_add_inventory_purchasing`). Cancelar uma compra já recebida
      (estorno, RN 10.6.6) ainda não implementado — `cancel()` só funciona em `draft`/`ordered`.
- [x] Sales — só venda à vista implementada, ver abaixo
      (migration `20260804183648_add_sales_customers_payments`). Venda a prazo/parcelamento
      automática gerando `Receivable` ainda não existe — decisão explícita da Fase 4, fica pra
      uma etapa futura que reabra o Sales.
- [x] Customers — CRUD básico implementado, ver abaixo (mesma migration).
- [x] Payments — cadastro de formas de pagamento (com taxa e conta financeira de destino desde
      a Fase 4), ver abaixo.
- [x] Financeiro (FinancialAccount, CashFlow, Receivables, Payables, Expenses) — ver abaixo
      (migration `20260804190647_add_finance`). Compra recebida gerando `Payable` automática
      ainda não existe — decisão explícita, fica pra uma etapa futura que reabra o Purchasing.
- [x] Reporting (Dashboard, relatórios, DRE gerencial) — Fase 5, **sem tabela nova** — só
      agregação de leitura sobre as tabelas já existentes (Sale/SaleItem/Expense/Receivable/
      Payable/FinancialTransaction/StockBalance). Exportação (CSV/XLSX) e os relatórios listados
      como "futuro" em §10.18 do Documento de Negócio (curva ABC, giro de estoque etc.) não
      implementados — decisão explícita.
- [ ] Suppliers — ver seção Purchasing (já implementado)
- [ ] Notifications — ainda não implementado
- [x] Audit — trilha append-only + `GET /audit` consultável (view_audit); cobertura parcial de
      eventos, ver `audit_logs` abaixo.
- [x] Imports — preview/confirm/revert (Fase 6); ver `import_jobs`/`import_rows` abaixo.
      Compras/vendas históricas e exportação (CSV/XLSX) ficam de fora desta rodada.

---

## Identity / Tenancy

Fonte: `apps/api/prisma/schema.prisma`, migrations `20260804140629_init` e
`20260806192214_add_company_settings`.

### `companies`
Raiz do tenant — não possui `company_id` (é a própria empresa). Não segue TA-DATA-001
por definição (ver comentário no schema.prisma).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| name | text | |
| document | text? | |
| segment | text? | |
| plan | text? | |
| brand_accent_color | text | default `#C49A28` — token `--brand-accent` (design-system §4.3) |
| email / phone | text? | contato operacional da empresa |
| currency | text | default `BRL`; fica bloqueada após o início das operações |
| timezone | text | default `America/Sao_Paulo` |
| operation_start_date | date? | data civil de início da operação |
| allow_negative_stock | boolean | default `false` |
| allocation_method | text | `proportional_value` ou `proportional_quantity` |
| default_min_stock | numeric(14,3)? | política prospectiva para novos produtos |
| discount_limit | numeric(5,2)? | percentual máximo configurado pela empresa |
| status | enum(active, inactive) | |
| created_at / updated_at / deleted_at | timestamptz | |

### `users`
Entidade global (exceção documentada em TA-DATA-003 — login por e-mail é global). Não tem
`company_id`; o vínculo com empresa(s) é feito por `memberships`.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| name | text | |
| email | text UNIQUE (global) | |
| password_hash | text | |
| status | enum(active, invited, blocked) | |
| created_at / updated_at / deleted_at | timestamptz | |

### `roles`
Catálogo global dos papéis do sistema (Documento de Negócio, seção 9). Permissões
personalizadas por empresa são extensão futura (Design System, seção 6.3) — não implementada
ainda, por isso a tabela não é company-scoped no MVP.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| name | enum(owner, admin, sales, inventory, finance, viewer) UNIQUE | |
| permissions | text[] | |
| created_at / updated_at | timestamptz | |

### `memberships`
Vincula `users` a `companies` com um `roles` — regra TA-DATA-001 completa (tabela operacional).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| user_id | uuid FK → users | |
| role_id | uuid FK → roles | |
| status | enum(active, invited, removed) | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Constraints: `UNIQUE(company_id, user_id)` · índice `(company_id, status)` (TA-DATA-002).

### `invitations`

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| email | text | |
| role_id | uuid FK → roles | |
| token | text UNIQUE | identificador técnico do convite, não é unicidade de negócio |
| expires_at | timestamptz | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, email)` (TA-DATA-002).

### `refresh_tokens`
Fonte: migration `20260804143518_add_refresh_token`. Sessão de refresh token (§9.1: access
curto ~15min + refresh rotativo revogável). Global como `users` (TA-DATA-003) — a empresa da
sessão é um dado da própria sessão, não faz da tabela "operacional" no sentido de TA-DATA-001
(por isso não segue o conjunto completo de campos de auditoria — sem `updated_at`/`deleted_at`,
já que o ciclo de vida é criar → revogar, nunca editar).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| company_id | uuid FK → companies | empresa escopada nesta sessão |
| token_hash | text UNIQUE | SHA-256 do token bruto (nunca o token em claro) |
| expires_at | timestamptz | |
| revoked_at | timestamptz? | setado no logout ou na rotação (refresh) |
| created_at | timestamptz | |

Índice: `(user_id)`.

---

## Audit

### `audit_logs`
Trilha append-only para operações sensíveis. Não há atualização ou exclusão exposta pela
aplicação; o registro é criado na mesma transação do evento de origem.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | escopo obrigatório do tenant |
| user_id | uuid? FK → users | ator; pode ser nulo para automações futuras |
| action | text | evento estável, ex.: `stock.adjusted` |
| entity_type / entity_id | text / uuid? | alvo da operação |
| before_data / after_data | jsonb? | estado relevante, sem senhas ou tokens |
| reason | text? | obrigatório quando a regra da ação exigir motivo |
| origin | text | `api` por padrão; preparado para automação/importação |
| created_at | timestamptz | |

Índices: `(company_id, created_at)` e `(company_id, entity_type, entity_id)`.

**Consulta**: `GET /audit` (permissão `view_audit`, exclusiva do papel `owner` — BR §9.1/§10.23
regra 4), filtros opcionais `entityType`/`entityId`/`action`/`from`/`to`/`limit` (máx. 200,
padrão 50), mais recentes primeiro. Escrita cobre `stock.adjusted`, `purchase.received`,
`purchase.draft_updated`, `purchase.cancelled`, `sale.confirmed`, `sale.draft_updated`, `sale.cancelled`, `product.repriced`, `receivable.paid`, `receivable.cancelled`,
`payable.paid`, `payable.cancelled` e `transfer.created` — cobertura completa
(login, mudança de permissão, cancelamentos de outros domínios, alteração de preço etc.) é débito documentado, não
implementado ainda.

## Idempotência

### `idempotency_records`
Chaves persistidas por empresa e operação para impedir que uma repetição de comando crítico
gere um segundo efeito de estoque ou caixa. Após conclusão, a resposta original é devolvida.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | isola a chave por tenant |
| operation | text | comando e recurso, ex.: `sales.confirm:{id}` |
| idempotency_key | text | valor do cabeçalho HTTP |
| response | jsonb? | resposta concluída; nula enquanto processa |
| created_at / completed_at | timestamptz | ciclo técnico do comando |

Constraints: `UNIQUE(company_id, operation, idempotency_key)` · índice `(company_id, completed_at)`.

Cabeçalho opcional `Idempotency-Key` (TA-API-002) aceito hoje em `POST /inventory/adjustments`,
`POST /purchasing/purchases/:id/receive`, `POST /sales/:id/confirm`,
`POST /receivables/:id/pay`, `POST /payables/:id/pay`,
`POST /cash-flow/transfers`, `POST /imports/:entityType/confirm` e `POST /imports/:id/revert`.

## Imports

Migração das planilhas da MAFA Store (BR §10.19, Fase 6). Escopo desta rodada: produtos (com
alias), estoque inicial, clientes, fornecedores, despesas, contas a pagar/receber — compras e
vendas históricas ficam de fora (já marcadas como opcionais na própria BR). Só CSV, cabeçalho
fixo por tipo (sem UI de mapeamento de colunas livre), processamento síncrono (sem fila
BullMQ/Redis — débito documentado no README para quando o volume justificar).

### `import_jobs`
Uma linha por confirmação de importação (não por dry-run — preview nunca persiste nada).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| entity_type | enum(product, initial_stock, customer, supplier, expense, payable, receivable) | |
| status | enum(completed, reverted) | |
| file_name | text? | |
| total_rows / created_count / updated_count / skipped_count / rejected_count | integer | contagens do relatório (RN 10.19, critério de aceite) |
| expected_total | numeric(14,2)? | total informado pelo usuário a partir da planilha original (BR §34.8) |
| reconciled_total | numeric(14,2)? | soma das linhas efetivamente criadas — só para tipos com `amountOf()` (despesas, contas a pagar/receber) |
| created_at / created_by | — | quem importou e quando (RN 10.19.6) |
| reverted_at / reverted_by | timestamptz? / uuid? | preenchidos só quando revertida |

Índice: `(company_id, entity_type, created_at)`. `divergence` (reconciled_total - expected_total)
é calculado na leitura, não persistido.

### `import_rows`
Nunca apaga — TA-DATA-001. Uma linha por linha da planilha confirmada, inclusive as rejeitadas
(RN 10.19.2/10.19.3: nenhuma linha inválida entra silenciosamente, erro fica registrado por
linha/coluna).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| import_job_id | uuid FK → import_jobs | |
| company_id | uuid FK → companies | |
| row_number | integer | linha 1 é o cabeçalho — dados começam em 2 |
| raw_data | jsonb | células originais da linha (usadas também para reverter estoque inicial) |
| status | enum(created, updated, skipped, rejected) | `updated` só ocorre em alias registrado num produto existente (RN-IMP-002) |
| errors | jsonb? | `{coluna: mensagem}` |
| result_entity_type / result_entity_id | text? / uuid? | entidade afetada por esta linha, quando houver |
| duplicate_action | enum(use_existing, create_new, register_alias, ignore)? | RN-IMP-002, só quando o preview apontou duplicidade |

Índice: `(import_job_id, row_number)`.

**Casamento de duplicidade de produto** (RN-IMP-001/002): SKU exato → `matchedBy: sku`; nome
exato (case-insensitive) ou já presente em `products.aliases` → `matchedBy: name`/`alias`. Sem
fuzzy matching (Levenshtein etc.) nesta rodada. `register_alias` adiciona o nome da planilha ao
array `aliases` do produto existente, nunca cria um produto novo.

**Estoque inicial** (RN 10.19.8): nunca escreve saldo direto — reaproveita
`ProductsService.appendCostHistory()` (mesma peça usada no recebimento de compra) para fixar o
custo e `InventoryService.adjustStock()` para lançar a movimentação de entrada.

**Reversão** (BR §34.8: "reversível antes do aceite final"): soft, nunca apaga — inativa as
entidades com `status: created` (produto/cliente/fornecedor via `deactivate()`, despesa/conta via
`cancel()`) e lança um ajuste de estoque compensatório negativo para linhas de estoque inicial.
Linhas `updated` (alias registrado) não são desfeitas automaticamente — o produto já existia
antes do import. Só permitida uma vez por `ImportJob` (`status` vira `reverted`).

**Isolamento por linha na confirmação**: cada linha roda dentro de um `SAVEPOINT` da transação
por-requisição (RLS/`TenantTransactionInterceptor`) — sem isso, um erro de banco numa linha
abortaria a transação inteira do Postgres e reprovaria silenciosamente todas as linhas
seguintes, violando RN 10.19.3.

## Catalog

### `categories`, `brands`
Estrutura idêntica: `id`, `company_id`, `name`, `status` (active/inactive), campos de
auditoria TA-DATA-001. `UNIQUE(company_id, name)` · índice `(company_id, status)`.

### `tags`
`id`, `company_id`, `name`, campos de auditoria TA-DATA-001. `UNIQUE(company_id, name)` ·
índice `(company_id)`.

### `products`

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| sku | text | |
| name | text | |
| category_id | uuid? FK → categories | |
| brand_id | uuid? FK → brands | |
| unit | text | unidade de medida |
| status | enum(active, inactive) | |
| aliases | text[] | RN-IMP-001 |
| min_stock | numeric(14,3)? | estoque mínimo (§10.3) — alimenta o alerta de estoque baixo do Inventory (RN 10.7.8); adicionado na migration `20260804175603_add_inventory_purchasing` |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Constraints: `UNIQUE(company_id, sku)` · índice `(company_id, status)`.

**API**: `PATCH /catalog/products/:id` edita campos cadastrais (nunca preço/custo — ver
`product_prices` abaixo); `PATCH /:id/reactivate` (BR US-PROD-002) espelha `/:id/deactivate`;
`GET /catalog/products` aceita `q`/`page`/`pageSize` opcionais — sem `page` devolve o array
completo de sempre (retrocompatível com os seletores de produto em Compras/Vendas/Estoque), com
`page` devolve `{items,total,page,pageSize}`.

### `product_variants`

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| product_id | uuid FK → products | |
| sku_variant | text | |
| attributes | jsonb | ex.: tamanho/volume |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Constraints: `UNIQUE(company_id, sku_variant)` · índice `(company_id, product_id)`.

### `product_prices`
Histórico append-only (RN-PRC-003) — cada alteração de preço insere uma nova linha, nunca
sobrescreve a anterior.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| product_id | uuid FK → products | |
| product_variant_id | uuid? FK → product_variants | preço no nível de variação, quando aplicável |
| cost_price | numeric(14,4) | **calculado, nunca editável direto** (DS-FORM-004) — TA-DOMAIN-001 |
| sale_price | numeric(14,2) | TA-DOMAIN-001 |
| margin | numeric(7,4)? | TA-DOMAIN-001 |
| effective_from | timestamptz | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, product_id, effective_from)`.

**API**: `POST /catalog/products/:id/reprice` (BR §10.3 regras 8-9) é a única forma de mudar
`sale_price` — insere uma nova linha aqui (nunca edita a existente) e grava um
`audit_logs` com `action: 'product.repriced'` e o `reason` informado. `cost_price` é
calculado por recebimentos/ajustes autorizados, nunca digitado nesse comando (DS-FORM-004).

### `product_tags`
Tabela de associação explícita `products` ↔ `tags` (em vez de m:n implícito do Prisma), para
cumprir TA-DATA-001/002 também no vínculo.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| product_id | uuid FK → products | |
| tag_id | uuid FK → tags | |
| created_at / created_by / deleted_at | — | TA-DATA-001 (sem `updated_at`: associação não é editada, só criada/removida) |

Constraints: `UNIQUE(product_id, tag_id)` · índice `(company_id)`.

---

## Inventory

Fonte: `apps/api/prisma/schema.prisma`, migration `20260804175603_add_inventory_purchasing`.

### `stock_balances`
Saldo materializado por variante — **exceção documentada a TA-DATA-001** (mesmo espírito de
`refresh_tokens`): é uma projeção reconciliável do somatório de `stock_movements` (RN
10.7.4/10.7.5), não um registro de negócio próprio — por isso sem `created_by`/`deleted_at`.
`disponível = físico - reservado`; físico não é armazenado, é `quantity_available +
quantity_reserved`.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| product_variant_id | uuid FK → product_variants | |
| quantity_available | numeric(14,3) | |
| quantity_reserved | numeric(14,3) | |
| quantity_in_transit | numeric(14,3) | ainda não usado (sem Sales/transferências) |
| updated_at | timestamptz | |

Constraints: `UNIQUE(company_id, product_variant_id)`.

### `stock_movements`
Registro **imutável** (RN 10.7.1/10.7.2/10.7.3) — toda alteração de estoque gera uma
movimentação, nunca é editada nem apagada; correções são movimentações compensatórias. Por
ser append-only, sem `updated_at`/`deleted_at` (mesma exceção de `stock_balances`).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| product_variant_id | uuid FK → product_variants | |
| type | enum(in, out, adjustment, return) | |
| quantity | numeric(14,3) | com sinal |
| unit_cost | numeric(14,4)? | |
| origin_type | enum(purchase, adjustment, return, sale) | `sale` adicionado na migration `20260804183648_add_sales_customers_payments` |
| origin_id | uuid | referência polimórfica (compra, ajuste, devolução, venda) |
| created_at / created_by | — | sem `updated_at`/`deleted_at` — imutável |

Índice: `(company_id, product_variant_id)`.

**Consulta:** `GET /inventory/movements` inclui a identificação da variação/produto e, quando
a origem é um ajuste manual, motivo e sinalização de aprovação. O filtro opcional
`productVariantId` e o escopo obrigatório de `company_id` permanecem aplicados.

### `stock_adjustments`
Complementa uma `stock_movement(type=adjustment)` com motivo (RN 10.7.9) e aprovação (RN
10.7.10). `requires_approval` calculado por um limiar fixo no `InventoryService` (50 unidades)
— sem fila de aprovação real ainda; `approved_by` é preenchido com o próprio ator no MVP.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| product_variant_id | uuid FK → product_variants | |
| stock_movement_id | uuid UNIQUE FK → stock_movements | |
| reason | text | |
| requires_approval | boolean | |
| approved_by | uuid? FK → users | |
| created_at / created_by / deleted_at | — | TA-DATA-001 (sem `updated_at`) |

Índice: `(company_id, product_variant_id)`.

### `stock_reservations`
Modelo completo desde já (TA-DATA-004), **sem service/endpoint ainda** — quem cria uma reserva
é o Sales (Fase 3), que ainda não existe. `sale_id` sem FK por enquanto (referência futura,
mesmo padrão de `origin_id` em `stock_movements`).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| sale_id | uuid | sem FK (Sale não existe ainda) |
| product_variant_id | uuid FK → product_variants | |
| quantity | numeric(14,3) | |
| status | enum(active, released, consumed) | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, product_variant_id)`.

---

## Purchasing

Fonte: `apps/api/prisma/schema.prisma`, migration `20260804175603_add_inventory_purchasing`.

### `suppliers`

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| name | text | |
| document / contact_name / phone / whatsapp / email | text? | |
| status | enum(active, inactive) | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, status)`.

**API**: `PATCH /purchasing/suppliers/:id` (campos cadastrais) e `PATCH /:id/reactivate`,
mesmo padrão de `products` acima. `GET /purchasing/suppliers` também aceita
`q`/`page`/`pageSize` opcionais, retrocompatível (sem `page`, array completo, usado pelo
seletor de fornecedor em Compras).
`GET /purchasing/suppliers/:id` retorna a ficha agregada, com totais normalizados em BRL via
`exchange_rate`, saldo de contas a pagar e até cinco compras recentes, sempre filtrados por
`company_id`.

### `purchases`
Sem status financeiro ainda (Payables é Fase 4, fora de escopo — sinalizado explicitamente).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| supplier_id | uuid? FK → suppliers | |
| status | enum(draft, ordered, partially_received, received, cancelled) | |
| currency | text | default `BRL` |
| exchange_rate | numeric(14,6)? | |
| exchange_rate_date | timestamptz? | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, status)`.

### `purchase_items`
`quantity_received` é materializado (somatório de `purchase_receipt_items` deste item),
atualizado transacionalmente pelo recebimento — mesmo padrão de "saldo materializado,
reconciliável" de `stock_balances`.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| purchase_id | uuid FK → purchases | |
| product_variant_id | uuid FK → product_variants | |
| quantity | numeric(14,3) | |
| unit_cost_origin_currency | numeric(14,4) | |
| quantity_received | numeric(14,3) | materializado, default 0 |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, purchase_id)`.

### `purchase_receipts`
Um recebimento (total ou parcial, RN 10.6.4/10.6.5/10.6.14) — evento concluído, nunca editado
depois de criado (sem `updated_at`, mesma lógica de `stock_movements`).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| purchase_id | uuid FK → purchases | |
| received_at | timestamptz | |
| created_at / created_by / deleted_at | — | sem `updated_at` |

Índice: `(company_id, purchase_id)`.

### `purchase_receipt_items`
`unit_cost_final` já inclui o rateio de custos adicionais (frete etc.) — é o valor que
alimenta o cálculo de custo médio móvel (RN 11.4), via `InventoryService.receiveGoods()`.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| purchase_receipt_id | uuid FK → purchase_receipts | |
| purchase_item_id | uuid FK → purchase_items | |
| product_variant_id | uuid FK → product_variants | |
| quantity_received | numeric(14,3) | |
| unit_cost_final | numeric(14,4) | |
| created_at / created_by / deleted_at | — | sem `updated_at` |

Índice: `(company_id, purchase_receipt_id)`.

### `purchase_cost_allocations`
Rateio de custos adicionais (frete etc.) por item do recebimento — método inicial
proporcional ao valor dos itens (RN 10.6, exemplo de cálculo §10.6: 10un × R$100 + frete R$100
→ custo unitário final R$110, coberto pelo teste de integração de Purchasing).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| purchase_receipt_id | uuid FK → purchase_receipts | |
| purchase_receipt_item_id | uuid FK → purchase_receipt_items | |
| type | text | ex.: `freight` |
| amount | numeric(14,2) | valor já rateado para este item |
| created_at / created_by / deleted_at | — | sem `updated_at` |

Índice: `(company_id, purchase_receipt_id)`.

---

## Customers, Payments, Sales

Fonte: `apps/api/prisma/schema.prisma`, migration `20260804183648_add_sales_customers_payments`.
Escopo desta fase: **só venda à vista** — sem parcelamento, sem conta a receber (Receivables é
Fase 4). Ver decisão registrada no histórico de commits (Fase 3).

### `customers`

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| name | text | |
| whatsapp / phone / email / instagram | text? | duplicidade não é bloqueada — RN 10.9.3 diz que gera alerta (UX de frontend), não erro de backend |
| birth_date | date? | |
| status | enum(active, inactive) | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, status)`.

**API**: `PATCH /customers/:id` (campos cadastrais) e `PATCH /:id/reactivate`, mesmo padrão de
`products`/`suppliers` acima. `GET /customers` também aceita `q`/`page`/`pageSize` opcionais,
retrocompatível (sem `page`, array completo, usado pelo seletor de cliente em Vendas).
`GET /customers/:id` retorna a ficha agregada, com indicadores em `Decimal`, saldo de
recebíveis e até cinco vendas recentes, sempre filtrados por `company_id`.

### `payment_methods`
Sem prazo de recebimento nem configuração de parcelas ainda (venda só à vista nesta fase).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| type | enum(cash, pix, debit_card, credit_card, bank_transfer, store_credit, other) | |
| name | text | |
| fee_rate | numeric(7,4)? | percentual |
| fee_fixed | numeric(14,2)? | |
| financial_account_id | uuid? FK → financial_accounts | adicionado na migration `20260804190647_add_finance` — conta de destino (§10.12); quando presente, uma venda à vista confirmada gera uma `financial_transaction` real |
| status | enum(active, inactive) | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, status)`.

### `sales`
`cmv_calculated`/`gross_profit_calculated` são recalculados tanto na confirmação quanto numa
devolução (RN 10.11.8: "CMV deverá ser revertido proporcionalmente aos itens devolvidos") — sem
precisar de um módulo de Reporting.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| customer_id | uuid? FK → customers | opcional (RN 10.9.1) |
| channel | enum(presencial, whatsapp, instagram, catalogo, outro) | simplificado — sem `marketplace` (futuro) |
| status | enum(draft, confirmed, cancelled, partially_returned, returned) | simplificado (doc autoriza — "poderá simplificar os status no MVP") — sem `reservada`/`paga`/`entregue` separados |
| subtotal | numeric(14,2) | soma de quantidade × preço unitário |
| discount | numeric(14,2) | só o desconto geral da venda (desconto por item fica em `sale_items.discount`) |
| total | numeric(14,2) | receita líquida |
| cmv_calculated | numeric(14,2)? | |
| gross_profit_calculated | numeric(14,2)? | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, status)`.

### `sale_items`
`quantity_returned` é materializado (somatório de `sale_return_items` deste item), mesmo
padrão de `purchase_items.quantity_received`.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| sale_id | uuid FK → sales | |
| product_variant_id | uuid FK → product_variants | |
| quantity | numeric(14,3) | |
| unit_price | numeric(14,2) | |
| discount | numeric(14,2) | desconto deste item |
| unit_cost_at_sale | numeric(14,4)? | congelado na confirmação (RN 10.10.9/10.10.10) — o CMV histórico nunca muda quando o custo atual do produto muda |
| quantity_returned | numeric(14,3) | materializado, default 0 |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, sale_id)`.

### `sale_payments`
Criado só na confirmação — imutável dali em diante (sem `updated_at`, mesma lógica de
`purchase_receipts`). Sem `financial_transaction`/livro-caixa ainda (CashFlow é Fase 4).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| sale_id | uuid FK → sales | |
| payment_method_id | uuid FK → payment_methods | |
| amount | numeric(14,2) | valor bruto pago pelo cliente |
| fee_amount | numeric(14,2) | calculado a partir de `payment_methods.fee_rate`/`fee_fixed` |
| net_amount | numeric(14,2) | `amount - fee_amount` |
| created_at / created_by / deleted_at | — | sem `updated_at` |

Índice: `(company_id, sale_id)`.

### `sale_returns`
Evento de devolução (imutável, sem `updated_at` — mesma lógica de `purchase_receipts`).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| sale_id | uuid FK → sales | |
| reason | text | |
| created_at / created_by / deleted_at | — | sem `updated_at` |

Índice: `(company_id, sale_id)`.

### `sale_return_items`
`condition=damaged` **nunca** volta ao estoque disponível nesta fase — não existe bucket de
"estoque indisponível" no modelo atual (decisão explícita da Fase 3, mesmo espírito da decisão
sobre compra já recebida na Fase 2).

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| sale_return_id | uuid FK → sale_returns | |
| sale_item_id | uuid FK → sale_items | |
| product_variant_id | uuid FK → product_variants | |
| quantity | numeric(14,3) | |
| condition | enum(apt, damaged) | |
| created_at / created_by / deleted_at | — | sem `updated_at` |

Índice: `(company_id, sale_return_id)`.

---

## Financeiro (FinancialAccount, CashFlow, Receivables, Payables, Expenses)

Fonte: `apps/api/prisma/schema.prisma`, migration `20260804190647_add_finance`. Escopo desta
fase: módulos financeiros standalone + retrofit pontual do Sales (venda à vista gera uma
`financial_transaction` real quando a forma de pagamento tem conta vinculada). Venda a prazo
gerando `receivable` automático e compra gerando `payable` automático ficam pra depois.

### `financial_accounts`
Saldo **nunca é materializado** — sempre calculado por agregação de `financial_transactions`
(RN 10.13.3), evitando mais uma tabela pra reconciliar.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| name | text | |
| status | enum(active, inactive) | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, status)`.

### `financial_transactions`
Lançamento realizado de caixa — **imutável** após criado (regra de integridade nº 10 do
Documento de Negócio). Convenção de sinal: `amount` positivo em `type=in`, negativo em
`type=out`/`transfer` de saída — assim `SUM(amount)` por conta já dá o saldo direto.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| financial_account_id | uuid FK → financial_accounts | |
| type | enum(in, out, transfer, adjustment) | |
| amount | numeric(14,2) | com sinal |
| origin_type | enum(sale_payment, receivable_payment, payable_payment, expense, transfer, adjustment) | |
| origin_id | uuid | referência polimórfica |
| description | text? | |
| occurred_at | timestamptz | |
| created_at / created_by | — | sem `updated_at`/`deleted_at` — imutável |

Índice: `(company_id, financial_account_id)`.

### `transfers`
Transferência entre contas próprias — **nunca** é receita/despesa (RN 10.13.2/10.16.5). Gera
duas `financial_transactions` (saída da origem, entrada no destino) com `origin_type=transfer`
e `origin_id` = este `transfer`.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| from_account_id | uuid FK → financial_accounts | |
| to_account_id | uuid FK → financial_accounts | |
| amount | numeric(14,2) | |
| reason | text? | |
| created_at / created_by | — | sem `updated_at`/`deleted_at` |

Índice: `(company_id)`.

### `receivables` / `receivable_payments`
"Vencida" (RN 10.14.3) é computado na leitura (`due_date < hoje` e status pendente/parcial) —
sem job agendado no projeto ainda, sem status `overdue` armazenado. `amount_received` é
materializado; `pay()` nunca deixa superar `amount_original` (RN 10.14.2). Cancelar exige
motivo (RN 10.14.5) — `receivable_payments` é imutável (sem `updated_at`).

| Coluna (`receivables`) | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| customer_id | uuid? FK → customers | |
| sale_id | uuid? FK → sales | venda a prazo que originou as parcelas |
| installment_number / installment_count | integer? | posição e total da agenda gerada automaticamente |
| description | text | |
| amount_original | numeric(14,2) | |
| amount_received | numeric(14,2) | materializado, default 0 |
| due_date | timestamptz | |
| status | enum(pending, partially_received, received, cancelled) | |
| cancel_reason | text? | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

| Coluna (`receivable_payments`) | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| receivable_id | uuid FK → receivables | |
| financial_account_id | uuid FK → financial_accounts | |
| amount | numeric(14,2) | aplicado ao saldo da dívida |
| interest / discount | numeric(14,2)? | ajustam só o caixa recebido, não o saldo da dívida |
| paid_at | timestamptz | |
| created_at / created_by | — | sem `updated_at` |

Índices: `(company_id, status)` em `receivables`; `(company_id, receivable_id)` em
`receivable_payments`.

### `payables` / `payable_payments`
Estrutura simétrica a `receivables`/`receivable_payments`. Compras e despesas futuras podem
gerar várias parcelas; `expenses.payable_id` permanece como ponte de compatibilidade para a
primeira parcela.

| Coluna (`payables`) | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| supplier_id | uuid? FK → suppliers | |
| purchase_id | uuid? FK → purchases | compra que originou a agenda |
| expense_id | uuid? FK → expenses | despesa que originou a agenda |
| installment_number / installment_count | integer? | posição e total da agenda |
| description | text | |
| amount_original | numeric(14,2) | |
| amount_paid | numeric(14,2) | materializado, default 0 |
| due_date | timestamptz | |
| status | enum(pending, partially_paid, paid, cancelled) | |
| cancel_reason | text? | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

`payable_payments`: mesmas colunas de `receivable_payments`, trocando `receivable_id` por
`payable_id`.

Índices: `(company_id, status)` em `payables`; `(company_id, payable_id)` em
`payable_payments`.

### `expenses`
RN 10.15.1/10.15.2/10.15.3: registrar uma despesa não significa pagá-la. Criada com
`paidNow=true` (na API) gera uma `financial_transaction` de saída direto (`status=paid`);
criada como despesa futura (`paidNow=false`) gera automaticamente uma ou mais parcelas em
`payables`; `payable_id` aponta para a primeira por compatibilidade — pagar depois é baixar
essas contas, sem endpoint de
pagamento duplicado em `expenses`.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| description | text | |
| category | enum(mercadorias, frete, embalagem, publicidade, plataforma, telefone, internet, aluguel, energia, transporte, combustivel, taxa, imposto, manutencao, pro_labore, retirada, despesa_administrativa, perda, outra) | §10.15 |
| amount | numeric(14,2) | |
| competence_date | timestamptz | |
| due_date | timestamptz? | obrigatório quando `paidNow=false` |
| paid_at | timestamptz? | preenchido quando `paidNow=true` |
| financial_account_id | uuid? FK → financial_accounts | preenchido quando `paidNow=true` |
| payable_id | uuid? UNIQUE FK → payables | preenchido quando `paidNow=false` |
| status | enum(pending, paid, cancelled) | |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Índice: `(company_id, status)`.

### `inventory_counts` / `inventory_count_items`
Inventário físico em duas fases. O rascunho congela o saldo esperado por variante; concluir
gera `stock_movements` e `stock_adjustments` somente para divergências, preservando o histórico.

| Coluna (`inventory_counts`) | Tipo | Notas |
|---|---|---|
| id / company_id | uuid | PK e escopo do tenant |
| status | enum(draft, completed, cancelled) | somente rascunho aceita contagens |
| notes | text? | observação operacional |
| completed_at / completed_by | timestamptz? / uuid? | autoria da conclusão |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

| Coluna (`inventory_count_items`) | Tipo | Notas |
|---|---|---|
| id / company_id | uuid | PK e escopo do tenant |
| inventory_count_id | uuid FK → inventory_counts | |
| product_variant_id | uuid FK → product_variants | único por inventário |
| expected_quantity / counted_quantity | numeric(14,3) | foto do sistema e quantidade física |
| counted_at / counted_by | timestamptz? / uuid? | autoria da contagem |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

### `profit_distribution_policies`
Política temporal usada depois do resultado líquido da DRE. Não cria despesa nem altera o
lucro operacional; quando o resultado é negativo, a base distribuível é zero.

| Coluna | Tipo | Notas |
|---|---|---|
| id / company_id | uuid | PK e escopo do tenant |
| effective_from | date | uma política por empresa/data inicial |
| reinvestment_rate / pro_labore_rate | numeric(5,2) | percentuais |
| reserve_rate / marketing_rate | numeric(5,2) | percentuais; soma total = 100% |
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

As tabelas novas de inventário/distribuição têm RLS forçada para `erp_mafa_app`, usando
`app.current_company_id`, como as demais tabelas operacionais.

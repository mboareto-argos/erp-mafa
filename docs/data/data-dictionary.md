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
- [x] Catalog — schema + CRUD básico implementados, ver abaixo (migration `20260804140629_init`)
- [ ] Inventory
- [ ] Purchasing
- [ ] Sales
- [ ] Customers / Suppliers
- [ ] Payments / Receivables / Payables / CashFlow
- [ ] Reporting / Notifications / Imports / Audit

---

## Identity / Tenancy

Fonte: `apps/api/prisma/schema.prisma`, migration `20260804140629_init`.

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
| created_at / updated_at / created_by / deleted_at | — | TA-DATA-001 |

Constraints: `UNIQUE(company_id, sku)` · índice `(company_id, status)`.

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

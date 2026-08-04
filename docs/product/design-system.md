# Design System — ERP Simplificado (MAFA Store → Multiempresa)

**Documento:** Design System / Especificação de UI-UX
**Baseado em:** Documento de Negócio — ERP Simplificado para Pequenos Vendedores (v1.0, 04/08/2026)
**Versão deste documento:** 1.0
**Status:** Fundação inicial — pronto para uso por designers, desenvolvedores e agentes de IA
**Público-alvo:** UX/UI designers, desenvolvedores front-end, arquitetos, QA, agentes de IA

---

## 1. Objetivo deste documento

Este documento define o **sistema de design** (design system) da plataforma: os princípios visuais e de interação, os tokens de design, os componentes, os padrões de tela e as regras de conteúdo que qualquer pessoa ou agente de IA deve seguir ao construir qualquer interface do produto.

Ele traduz para decisões concretas de UI os princípios já definidos no Documento de Negócio (seções 4.3, 13 e 9), e deve ser tratado como **fonte de verdade visual** — da mesma forma que o Documento de Negócio é a fonte de verdade funcional.

Este documento não substitui um arquivo de tokens executável (Figma Variables, JSON de tokens, Tailwind config, etc.). Ele descreve o que esse arquivo deve conter. A implementação técnica exata (biblioteca de componentes, tema do framework CSS) fica a critério da documentação técnica.

---

## 2. Decisão de direção visual

**Decisão registrada:** o produto usa uma identidade **neutra, profissional, tipo SaaS de gestão** — não a identidade de marca da MAFA Store (dourado/preto/creme, tom "perfumaria de luxo").

Motivo: a MAFA Store é o cliente piloto, mas o produto nasce para se tornar uma plataforma multiempresa (SaaS) usada por lojistas de segmentos variados (roupas, cosméticos, acessórios, revenda). Uma identidade visual "vestida" com a marca de um único cliente não escala e cria retrabalho de rebranding quando o segundo tenant entrar.

Como isso se resolve na prática:

- A **paleta-base do produto** (interface, textos, fundos, bordas, estados) é neutra e independente de qualquer marca de cliente.
- Existe **uma cor de acento configurável por empresa** (`--brand-accent`), usada em pontos de destaque de baixo risco visual (botão primário, ícone ativo, gráfico principal do dashboard, avatar da empresa). Para a MAFA Store, essa cor de acento é o dourado da marca (`#C49A28`), mas ela nunca substitui a paleta funcional (sucesso, erro, alerta, texto, fundo).
- Todo o sistema é desenhado desde o início como **multiempresa/white-label** (seção 6 deste documento), mesmo que o MVP tenha uma única empresa configurada.

Essa decisão está alinhada ao princípio de **Evolução progressiva** e **Isolamento de dados** do Documento de Negócio (4.3) — aqui aplicados ao visual: a marca de uma empresa não deve "vazar" para a estrutura do produto.

---

## 3. Princípios de design (derivados da seção 4.3 e 13 do Documento de Negócio)

### 3.1 Princípios de produto aplicados à UI

| Princípio de negócio | Tradução em UI |
|---|---|
| Simplicidade | Telas com poucos campos visíveis por vez; linguagem cotidiana; nunca jargão contábil por padrão |
| Automação | A UI mostra, em tempo real, os efeitos automáticos de uma ação (ex.: "essa venda vai gerar 3 parcelas de R$ 50") |
| Rastreabilidade | Todo registro tem um estado visual de "auditável" (histórico acessível a 1 clique) |
| Confiabilidade | Valores calculados são sempre visualmente diferenciados de valores digitados manualmente |
| Mobilidade | Todo fluxo crítico (venda, compra, despesa, recebimento) deve ser 100% operável no celular, com uma mão |
| Evolução progressiva | Recursos avançados ficam escondidos por padrão e são revelados por configuração ("modo avançado"), nunca empilhados na tela principal |
| Isolamento de dados | Nenhuma tela mistura dados de duas empresas; o seletor de empresa é sempre visível e inequívoco |
| Orientação por contexto | Toda tela responde "o que eu faço aqui" antes de responder "o que existe aqui" |

### 3.2 Princípios de interação (expande a seção 13.4 do Documento de Negócio)

1. **Uma tarefa por tela.** Fluxos de registro (nova venda, nova compra, nova despesa) são wizards curtos, não formulários únicos com 20 campos.
2. **Cálculo visível, nunca escondido.** Todo valor derivado (CMV, lucro, total da parcela) aparece na tela no momento em que os dados que o formam já existem — nunca só depois de salvar.
3. **Reversibilidade antes de gravidade.** Ações destrutivas ou financeiras sempre têm confirmação; ações de navegação e rascunho nunca têm confirmação.
4. **Rascunho é o padrão, perda de dados é a exceção.** Qualquer formulário longo salva estado localmente antes de ser enviado.
5. **Números conduzem, texto explica.** Dashboards e listas priorizam número + tendência; texto explicativo aparece sob demanda (tooltip, "saiba mais"), nunca por padrão.
6. **Estado vazio é uma oportunidade, não um erro.** Toda lista vazia orienta a próxima ação ("Você ainda não tem produtos cadastrados. Cadastrar o primeiro produto").
7. **Erros são acionáveis.** Mensagem de erro sempre diz o que fazer, nunca só o que está errado.
8. **Consistência antes de originalidade.** Um componente resolvido (ex.: seletor de forma de pagamento) é reaproveitado em todo o produto — não é redesenhado por tela.

---

## 4. Fundação de tokens

Tokens são os valores atômicos (cor, espaçamento, tipografia, etc.) que alimentam todos os componentes. Devem ser implementados como variáveis (CSS custom properties, Tailwind theme, ou Figma Variables) — nunca como valores fixos espalhados pelo código.

### 4.1 Cor — paleta neutra (base do produto)

Escala neutra usada para fundo, texto, bordas e superfícies. Uma escala de cinza com leve tom frio (azul muito dessaturado), para não competir com a cor de acento de cada tenant.

| Token | Hex | Uso |
|---|---|---|
| `--neutral-0` | `#FFFFFF` | Fundo de cards, modais, inputs |
| `--neutral-25` | `#FAFBFC` | Fundo de página (light) |
| `--neutral-50` | `#F2F4F7` | Fundo de seções secundárias, hover sutil |
| `--neutral-100` | `#E4E7EC` | Bordas padrão, divisores |
| `--neutral-200` | `#D0D5DD` | Bordas de input, bordas de card em foco |
| `--neutral-300` | `#98A2B3` | Ícones inativos, placeholder |
| `--neutral-500` | `#667085` | Texto secundário |
| `--neutral-700` | `#344054` | Texto de rótulos, texto secundário forte |
| `--neutral-900` | `#101828` | Texto primário, títulos |
| `--neutral-950` | `#0B0F19` | Fundo de página (dark), texto sobre acento claro |

### 4.2 Cor — paleta semântica

| Token | Hex | Uso |
|---|---|---|
| `--success-600` | `#079455` | Confirmações, saldo positivo, "pago", "recebido" |
| `--success-50` | `#ECFDF3` | Fundo de badge/alerta de sucesso |
| `--danger-600` | `#D92D20` | Erros, saldo negativo, "vencido", ações destrutivas |
| `--danger-50` | `#FEF3F2` | Fundo de badge/alerta de erro |
| `--warning-600` | `#DC6803` | Alertas (estoque baixo, conta a vencer) |
| `--warning-50` | `#FFFAEB` | Fundo de badge/alerta de atenção |
| `--info-600` | `#1570EF` | Informações neutras, dicas, "em trânsito" |
| `--info-50` | `#EFF8FF` | Fundo de badge informativo |

**Regra de negócio DS-COLOR-001:** cor nunca é o único indicador de estado (alinhado à seção 13.5 do Documento de Negócio — "não depender apenas de cores"). Todo uso de cor semântica é acompanhado de ícone e/ou texto (ex.: badge "Vencido" tem cor vermelha **e** a palavra "Vencido", nunca só uma bolinha vermelha).

**Regra DS-COLOR-002:** saldo/lucro negativo nunca usa cor vermelha "de alarme" pura — usa `--danger-600` mas com peso visual mais discreto que estados de erro do sistema (evita transmitir pânico em números que são normais na operação, como um mês fraco).

### 4.3 Cor — acento de marca (tenant)

| Token | Valor no MVP (MAFA Store) | Uso |
|---|---|---|
| `--brand-accent` | `#C49A28` | Botão primário, item ativo do menu, foco de input, gráfico principal, avatar/logo da empresa |
| `--brand-accent-hover` | `#A9821F` (accent escurecido 15%) | Hover/active do botão primário |
| `--brand-accent-subtle` | `#FBF3DF` (accent a 10% sobre `--neutral-0`) | Fundo de item selecionado, chip ativo |

**Regra DS-COLOR-003:** `--brand-accent` é a **única** variável de marca que muda entre empresas. Nenhum outro token muda por tenant no MVP. Isso é o que permite trocar a "cara" de cada loja sem redesenhar telas (ver seção 6).

**Regra DS-COLOR-004:** `--brand-accent` nunca é usado sozinho para transmitir sucesso, erro ou alerta — essas cores são sempre semânticas (4.2), nunca de marca. Isso evita que uma empresa configure um acento vermelho ou verde e quebre a leitura de status do sistema.

### 4.4 Tipografia

| Token | Família | Uso |
|---|---|---|
| `--font-sans` | Inter (ou equivalente humanista: Public Sans, IBM Plex Sans) | Toda a interface |
| `--font-mono` | JetBrains Mono / IBM Plex Mono | Valores monetários em tabelas densas (opcional), SKU, códigos |

Justificativa: fonte humanista sem serifa, alta legibilidade em telas pequenas e em tabelas numéricas — deliberadamente **não** a tipografia serifada da marca MAFA (reforça a decisão da seção 2: o produto não usa a identidade de cliente).

**Escala tipográfica:**

| Token | Tamanho / altura de linha | Peso | Uso |
|---|---|---|---|
| `--text-xs` | 12px / 16px | 400–500 | Legendas, metadados, timestamps |
| `--text-sm` | 14px / 20px | 400–500 | Texto de corpo padrão, inputs, tabelas |
| `--text-md` | 16px / 24px | 400–500 | Texto de destaque, texto de card |
| `--text-lg` | 18px / 26px | 500–600 | Subtítulos de seção |
| `--text-xl` | 20px / 28px | 600 | Título de card / bloco |
| `--text-2xl` | 24px / 32px | 600 | Título de página (desktop) |
| `--text-3xl` | 30px / 38px | 700 | Números de destaque no dashboard |
| `--text-display` | 36px / 44px | 700 | Indicador principal (ex.: saldo em caixa) |

**Regra DS-TYPE-001:** valores monetários grandes (dashboard, cards de resumo) usam `--text-3xl` ou `--text-display` com peso 700, sempre com o símbolo de moeda em peso menor (400–500) para não competir com o número.

### 4.5 Espaçamento

Escala em base 4px:

`--space-1: 4px` · `--space-2: 8px` · `--space-3: 12px` · `--space-4: 16px` · `--space-5: 20px` · `--space-6: 24px` · `--space-8: 32px` · `--space-10: 40px` · `--space-12: 48px` · `--space-16: 64px`

**Regra DS-SPACE-001:** espaçamento interno de componentes tocáveis (botões, itens de lista em mobile) nunca é menor que `--space-3` (12px) nas bordas, para sustentar a área de toque mínima (seção 4.6).

### 4.6 Raio, elevação e área de toque

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | 6px | Badges, chips, inputs pequenos |
| `--radius-md` | 8px | Botões, inputs, cards de lista |
| `--radius-lg` | 12px | Cards de dashboard, modais |
| `--radius-full` | 9999px | Avatares, badges de status arredondados |
| `--shadow-sm` | `0 1px 2px rgba(16,24,40,0.05)` | Cards em repouso |
| `--shadow-md` | `0 4px 8px rgba(16,24,40,0.08)` | Cards em hover, dropdowns |
| `--shadow-lg` | `0 12px 24px rgba(16,24,40,0.12)` | Modais, painel contextual |
| `--touch-target-min` | 44px × 44px | Alvo mínimo de toque em qualquer elemento interativo em mobile |

### 4.7 Motion

| Token | Valor | Uso |
|---|---|---|
| `--duration-fast` | 120ms | Hover, foco, toggle |
| `--duration-base` | 200ms | Abertura de modal, transição de painel |
| `--duration-slow` | 320ms | Transição de página/rota |
| `--easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Padrão geral |

**Regra DS-MOTION-001:** o sistema respeita `prefers-reduced-motion`; qualquer animação acima de `--duration-fast` deve ter uma versão reduzida (fade simples ou instantâneo).

---
## 5. Layout e responsividade

### 5.1 Breakpoints

| Token | Largura | Dispositivo alvo |
|---|---|---|
| `--bp-xs` | até 599px | Celular (retrato) — plataforma primária |
| `--bp-sm` | 600–959px | Celular (paisagem) / tablet pequeno |
| `--bp-md` | 960–1279px | Tablet / desktop pequeno |
| `--bp-lg` | 1280–1599px | Desktop |
| `--bp-xl` | 1600px+ | Desktop grande / monitor de operação (ex.: PDV de balcão) |

**Regra DS-LAYOUT-001 — Mobile-first, mas não mobile-only.** Todo fluxo é desenhado primeiro para `--bp-xs`, alinhado à seção 5.3 do Documento de Negócio (persona usa o celular como ferramenta principal). Telas de análise densa (relatórios, DRE, conciliação) podem ter uma versão desktop mais rica, mas nunca podem ficar indisponíveis no celular — no máximo, simplificadas.

### 5.2 Grid

- Mobile (`--bp-xs`/`--bp-sm`): coluna única, margem lateral `--space-4` (16px).
- Tablet (`--bp-md`): grid de 8 colunas, margem `--space-6`.
- Desktop (`--bp-lg`+): grid de 12 colunas, margem `--space-8`, largura máxima de conteúdo 1280px (conteúdo denso, como tabelas, pode ocupar 100% da área útil).

### 5.3 Estrutura de página — Desktop

```
┌───────────────────────────────────────────────────────────┐
│ Barra superior: seletor de empresa · busca · notificações · avatar │
├───────────┬───────────────────────────────────┬───────────┤
│           │                                   │           │
│  Menu     │        Conteúdo central            │  Painel   │
│  lateral  │   (título de página + ações        │  contex-  │
│  (fixo,   │    principais + corpo)             │  tual     │
│  colapsável)│                                  │ (opcional)│
│           │                                   │           │
└───────────┴───────────────────────────────────┴───────────┘
```

- **Menu lateral:** ícone + rótulo; colapsa para só-ícone em telas médias; item ativo usa `--brand-accent-subtle` de fundo e `--brand-accent` no ícone/texto.
- **Painel contextual:** usado para detalhe rápido sem sair da lista (ex.: clicar numa venda abre o resumo à direita, sem navegar). Fecha com Esc ou clique fora.

### 5.4 Estrutura de página — Mobile

```
┌─────────────────────────────┐
│  Barra superior (título +    │
│  ação secundária, se houver) │
├─────────────────────────────┤
│                               │
│         Conteúdo             │
│      (rolagem vertical)      │
│                               │
├─────────────────────────────┤
│  [+] Botão de ação flutuante │
├─────────────────────────────┤
│ Início │ Vendas │ Estoque │  │
│ Financeiro │ Mais           │
└─────────────────────────────┘
```

Reflete diretamente a seção 13.3 do Documento de Negócio: navegação inferior fixa com 5 destinos (Início, Vendas, Estoque, Financeiro, Mais) e um botão de ação em destaque que abre um seletor rápido (nova venda, nova compra, nova despesa, novo recebimento, novo produto, ajuste de estoque).

**Regra DS-LAYOUT-002:** o botão de ação flutuante nunca cobre conteúdo interativo (respeita uma zona de segurança de `--space-16` a partir da base) e some durante o preenchimento de formulários em tela cheia.

---

## 6. Sistema multiempresa (white-label) — como o visual se adapta por tenant

Esta seção conecta o design system à seção 6.3 / 24 (Fase 7 — SaaS multiempresa) do Documento de Negócio: o produto precisa nascer pronto para múltiplas empresas mesmo atendendo só a MAFA Store no início.

### 6.1 O que muda por empresa (tenant)

| Elemento | Muda por empresa? | Mecanismo |
|---|---|---|
| `--brand-accent` (cor) | Sim | Campo de configuração da empresa (seção 10.2 do Doc. de Negócio) |
| Logotipo / avatar da empresa | Sim | Upload em configurações da empresa |
| Nome da empresa exibido | Sim | Dado cadastral |
| Paleta neutra, tipografia, espaçamento, ícones, componentes | **Não** | Fixos no design system do produto |
| Terminologia (ex.: "cliente" vs "paciente" vs "aluno") | Não no MVP — estrutura prevista, não ativada | Dicionário de termos configurável (futuro, ver 6.3) |

**Regra DS-TENANT-001:** a customização por tenant é **restrita e cosmética por design**. O objetivo é permitir que cada lojista sinta "isso é a minha loja" sem permitir que a identidade de uma empresa comprometa a usabilidade, a acessibilidade (contraste) ou a consistência entre empresas (importante para suporte e para agentes de IA que operam múltiplos tenants).

### 6.2 Regra de contraste para acento configurável

**Regra DS-TENANT-002:** ao configurar `--brand-accent`, o sistema deve calcular automaticamente se o texto sobre essa cor deve ser claro ou escuro (checagem de contraste WCAG AA, mínimo 4.5:1 para texto normal) e travar cores de acento que não atinjam contraste mínimo em nenhum dos dois modos — evitando que um lojista escolha uma cor que quebre a acessibilidade do próprio sistema.

### 6.3 Extensões previstas (não fazem parte do MVP)

- Tema claro/escuro por preferência do usuário (estrutura de tokens já é compatível: todos os `--neutral-*` têm par claro/escuro definido nos tokens de superfície).
- Dicionário de termos por segmento (ex.: "produto" → "peça" para lojas de roupas), sem alterar a estrutura de dados.
- Fonte de marca do tenant (upload), restrita a um conjunto validado de fontes com boa legibilidade — não uma fonte arbitrária.

---

## 7. Navegação

### 7.1 Mapa de navegação (mobile — 5 destinos + ação rápida)

| Destino | Conteúdo |
|---|---|
| Início | Dashboard resumido (seção 9) |
| Vendas | Lista de vendas, nova venda, clientes |
| Estoque | Produtos, movimentações, compras, inventário |
| Financeiro | Contas a receber, contas a pagar, fluxo de caixa, despesas |
| Mais | Relatórios, importação/exportação, configurações, auditoria, usuários |

### 7.2 Mapa de navegação (desktop — menu lateral)

```
Início (dashboard)
Vendas
 ├─ Todas as vendas
 ├─ Nova venda
 ├─ Clientes
 └─ Trocas e devoluções
Estoque
 ├─ Produtos
 ├─ Movimentações
 ├─ Compras
 ├─ Fornecedores
 └─ Inventário
Financeiro
 ├─ Contas a receber
 ├─ Contas a pagar
 ├─ Fluxo de caixa
 ├─ Despesas
 └─ DRE
Relatórios
Configurações
 ├─ Empresa
 ├─ Usuários e permissões
 ├─ Formas de pagamento
 └─ Importação / Exportação
Auditoria
```

**Regra DS-NAV-001:** os itens de menu visíveis respeitam o perfil de acesso (seção 9 do Documento de Negócio) — um Vendedor nunca vê "DRE", "Financeiro" completo ou "Configurações" no menu, em vez de vê-los desabilitados. Itens sem permissão **não aparecem**, não aparecem cinza/bloqueados (evita frustração e vazamento de informação sobre a existência de dados que o usuário não pode ver).

**Regra DS-NAV-002:** o seletor de empresa (para usuários com acesso a mais de uma empresa, cenário multiempresa) fica sempre na barra superior, nunca dentro de um submenu, e qualquer troca de empresa recarrega o contexto por completo (nunca há mistura de dados de duas empresas na mesma tela — reforça a seção 4.3 "Isolamento de dados").

### 7.3 Ação rápida (botão de destaque)

Ordem de prioridade sugerida no seletor de ação rápida (mobile), baseada na frequência de uso esperada (seção 10.10 e 3.3 do Documento de Negócio — venda é a operação mais frequente):

1. Nova venda
2. Novo recebimento
3. Nova despesa
4. Nova compra
5. Ajuste de estoque
6. Novo produto

---

## 8. Biblioteca de componentes

Cada componente abaixo define: propósito, anatomia, estados obrigatórios e regras de uso. A implementação (React, Vue, Web Components) fica a critério da documentação técnica; esta seção é o contrato visual/funcional que a implementação deve cumprir.

### 8.1 Botões

**Variantes:** `primário` (fundo `--brand-accent`), `secundário` (contorno neutro), `terciário`/texto (sem fundo nem borda), `destrutivo` (fundo `--danger-600`).

**Tamanhos:** `sm` (32px altura, mobile denso/tabelas), `md` (40px altura, padrão), `lg` (48px altura, ação principal de tela cheia).

**Estados obrigatórios:** repouso, hover (desktop), foco (contorno visível, nunca só mudança de cor), pressionado, desabilitado, carregando (spinner substitui o texto, largura do botão não muda).

**Regra DS-BTN-001:** cada tela tem no máximo **um** botão primário visível por vez. Ações secundárias usam botão secundário ou terciário — evita ambiguidade sobre qual é a ação recomendada (alinhado ao princípio "Orientação por contexto").

**Regra DS-BTN-002:** botões destrutivos (cancelar venda, excluir produto, remover usuário) sempre abrem confirmação (ver 8.9) e nunca ficam adjacentes a um botão primário sem espaçamento de segurança mínimo (`--space-4`), para evitar toque acidental em mobile.

### 8.2 Campos de formulário (inputs)

**Tipos:** texto, número, moeda (formatação automática de milhar/decimal), percentual, data, seletor (select/combobox), busca com autocomplete, toggle, checkbox, radio, upload de arquivo/imagem.

**Anatomia:** rótulo (sempre visível, nunca só placeholder) → campo → texto de ajuda (opcional) → mensagem de erro (substitui o texto de ajuda quando presente).

**Regra DS-FORM-001:** nenhum campo usa *apenas* placeholder como rótulo (requisito de acessibilidade da seção 13.5 do Documento de Negócio — "rótulos").

**Regra DS-FORM-002 — Preenchimento progressivo.** Campos avançados/opcionais (ex.: adquirente, bandeira, parcelamento do lojista em uma venda) ficam recolhidos atrás de um link "mais opções" e só se expandem quando relevantes ao contexto (ex.: só aparecem depois que o usuário escolhe "cartão de crédito" como forma de pagamento).

**Regra DS-FORM-003 — Campo monetário.** Todo campo de valor monetário formata em tempo real (R$ 1.234,56), aceita entrada numérica direta (sem exigir digitar a vírgula) e nunca perde o valor digitado ao trocar de campo.

**Regra DS-FORM-004 — Distinção calculado vs. digitado.** Um campo cujo valor é calculado automaticamente (ex.: CMV, lucro estimado) é visualmente diferente de um campo editável: fundo `--neutral-50`, ícone de "calculado" e, ao toque/clique, uma explicação de como o valor foi obtido. Nunca parece um campo de texto comum.

### 8.3 Seletor de forma de pagamento

Componente reutilizado em vendas, recebimentos, despesas e pagamentos (reflete a seção 10.12 do Documento de Negócio).

**Anatomia:** lista de chips com ícone (PIX, dinheiro, débito, crédito, outro) → ao selecionar cartão/crédito, expande campos condicionais (parcelas, adquirente, bandeira, taxa) conforme DS-FORM-002.

**Regra DS-PAY-001:** o total líquido esperado (valor − taxa) aparece junto ao campo de taxa assim que ela é informada ou calculada — nunca exige o usuário calcular de cabeça.

### 8.4 Cards de indicador (KPI card)

Usados no dashboard (seção 10.17 do Documento de Negócio) e em cabeçalhos de listas (ex.: total de contas a receber no topo da lista de contas a receber).

**Anatomia:** rótulo (`--text-sm`, `--neutral-500`) → valor principal (`--text-3xl` ou `--text-display`) → variação vs. período anterior (seta + percentual, cor semântica) → (opcional) mini-gráfico de tendência.

**Regra DS-KPI-001:** todo card de indicador é clicável e leva à lista/relatório detalhado que compõe aquele número (critério de aceite explícito da seção 10.17 do Documento de Negócio: "Ao clicar no faturamento, o usuário deverá acessar as vendas que compõem o valor").

**Regra DS-KPI-002:** todo card indica visivelmente se o número é por **competência** ou por **caixa** (rótulo pequeno, ex.: "Faturamento (competência)"), nunca deixando essa distinção implícita — alinhado à seção 34.3 do Documento de Negócio, que identificou confusão entre regime de caixa e competência nas planilhas atuais.

**Regra DS-KPI-003:** cards de indicador que dependem de permissão financeira (lucro, CMV, margem) são omitidos por completo da grade para usuários sem essa permissão — o grid se reorganiza, nunca deixa um espaço vazio ou um card "bloqueado" visível (mesma lógica de DS-NAV-001).

### 8.5 Tabelas e listas

**Regra DS-TABLE-001:** toda tabela densa (desktop) tem uma versão em cards empilhados equivalente para mobile — nunca uma tabela com rolagem horizontal forçada como única opção em telas pequenas.

**Regra DS-TABLE-002:** colunas monetárias são sempre alinhadas à direita; colunas de status usam badge (8.6), nunca só texto colorido.

**Regra DS-TABLE-003 — Estado vazio.** Toda lista vazia mostra: ícone/ilustração simples, uma frase no tom da seção 13.2 do Documento de Negócio (ex.: "Você ainda não registrou nenhuma venda"), e um botão de ação primária para resolver o vazio (ex.: "Registrar primeira venda").

**Regra DS-TABLE-004 — Estado de carregamento.** Skeleton (placeholder cinza animado) no formato final do conteúdo — nunca um spinner central que "pisca" a tela inteira em listas que já tinham dado carregado antes (evita perda de contexto ao atualizar filtros).

### 8.6 Badges de status

Usados para status de venda, compra, conta a receber/pagar, estoque em trânsito, etc.

| Cor | Uso típico |
|---|---|
| `--success` | Pago, recebido, concluído, disponível |
| `--warning` | Pendente, aguardando, a vencer em breve, estoque baixo |
| `--danger` | Vencido, cancelado, estoque zerado |
| `--info` | Em trânsito, rascunho, em processamento |
| `--neutral` | Arquivado, inativo |

**Regra DS-BADGE-001:** o texto do badge é sempre o nome do status por extenso (nunca só um ícone ou uma cor), conforme já estabelecido em DS-COLOR-001.

### 8.7 Modais e painel contextual

**Modal:** usado para ações curtas e interruptivas (confirmar exclusão, editar um item específico dentro de um fluxo maior). Sempre tem título, corpo, e ações no rodapé com o botão primário à direita.

**Painel contextual (drawer lateral):** usado para visualizar/editar detalhe sem perder o contexto da lista (ex.: detalhe de uma venda). Preferido a modal quando o conteúdo é mais longo que uma confirmação simples.

**Regra DS-MODAL-001:** modais nunca são usados para formulários com mais de ~6 campos — nesse caso, o fluxo deve ser uma tela própria ou um painel contextual com rolagem.

### 8.8 Notificações e toasts

Reflete a seção 10.21 do Documento de Negócio (canais e tipos de notificação).

**Toast (feedback imediato de ação):** aparece após salvar/excluir/confirmar, some sozinho em 4–6s, nunca bloqueia a tela.

**Central de notificações (alertas de negócio):** sino na barra superior, lista alertas do tipo estoque baixo, conta vencendo, recebimento atrasado (seção 10.17 "Alertas"), cada um clicável levando direto à origem.

**Regra DS-NOTIF-001:** toasts de erro **não** somem automaticamente — exigem que o usuário os dispense, porque geralmente contêm uma ação necessária.

### 8.9 Confirmação de ações irreversíveis

Reflete o princípio de UX nº 5 e 6 da seção 13.4 do Documento de Negócio ("confirmar ações irreversíveis", "explicar consequências antes de concluir").

**Anatomia obrigatória:** título direto ("Cancelar esta venda?") → explicação das consequências em linguagem simples ("O estoque reservado será devolvido e a conta a receber será cancelada") → duas ações claramente diferenciadas (ação destrutiva nunca é a opção pré-focada/padrão).

### 8.10 Wizard de registro (nova venda, nova compra, nova despesa)

Padrão estrutural para os fluxos críticos da seção 19 do Documento de Negócio.

**Anatomia:** indicador de progresso simples (não numerado tecnicamente — usa linguagem de tarefa, ex.: "Itens → Pagamento → Confirmar") → uma etapa visível por vez em mobile, etapas podem coexistir em coluna única no desktop para usuários avançados → resumo fixo (subtotal, total) sempre visível durante todo o wizard → botão de ação primária sempre no mesmo lugar (parte inferior fixa em mobile).

**Regra DS-WIZARD-001:** o usuário nunca perde dados já preenchidos ao voltar uma etapa. Voltar é sempre não-destrutivo.

**Regra DS-WIZARD-002:** a última etapa sempre mostra um resumo completo de tudo que será gerado pela ação (reflete a seção 3.3 do Documento de Negócio — uma venda gera estoque, financeiro, indicadores; o usuário vê isso antes de confirmar, não depois).

---

## 9. Padrão de dashboard e visualização de dados

Aplica os indicadores e alertas definidos na seção 10.17 do Documento de Negócio a um layout concreto.

### 9.1 Estrutura da página Início (dashboard)

```
1. Seletor de período (padrão: mês atual) + comparação com período anterior
2. Linha de cards de KPI principais (faturamento, lucro líquido estimado, saldo em caixa, ticket médio)
   — cards de lucro/CMV omitidos para quem não tem permissão financeira (DS-KPI-003)
3. Faixa de alertas acionáveis (estoque baixo, contas vencendo) — só aparece se houver algo a mostrar
4. Gráfico de vendas por período (linha ou barra) — usa --brand-accent como cor da série principal
5. Produtos mais vendidos / mais lucrativos (lista curta, com link "ver relatório completo")
6. Contas a receber e a pagar próximas (lista curta, agrupada por vencimento)
```

### 9.2 Regras de gráficos

**Regra DS-CHART-001:** gráficos usam no máximo 1 cor de destaque (`--brand-accent`) para a série principal; séries comparativas (período anterior, meta) usam tons neutros (`--neutral-300`) para não competir visualmente.

**Regra DS-CHART-002:** todo gráfico tem uma representação tabular acessível equivalente (para leitores de tela e para exportação), nunca é a única forma de acessar aquele dado.

**Regra DS-CHART-003:** eixos e legendas nunca usam apenas cor para diferenciar séries — usam também padrão de traço (contínuo/tracejado) ou rótulo direto na linha, reforçando DS-COLOR-001.

---

## 10. Acessibilidade (implementa a seção 13.5 e 14 do Documento de Negócio)

| Requisito | Regra de implementação |
|---|---|
| Contraste suficiente | Texto normal ≥ 4.5:1, texto grande (≥18px/24px bold) ≥ 3:1 contra o fundo, validado inclusive para `--brand-accent` (DS-TENANT-002) |
| Navegação por teclado | Toda ação disponível ao mouse/toque é alcançável via Tab/Enter/Espaço, em ordem lógica |
| Foco visível | Contorno de foco nunca é removido (`outline: none` sem substituto é proibido); usa cor `--brand-accent` com contraste garantido |
| Rótulos | Todo input tem `<label>` associado ou `aria-label` equivalente (DS-FORM-001) |
| Leitores de tela | Ícones sem texto usam `aria-label`; ações assíncronas (salvando, carregando) são anunciadas via região `aria-live` |
| Textos alternativos | Toda imagem funcional (logo, ilustração de estado vazio) tem `alt` descritivo; imagens decorativas usam `alt=""` |
| Erros associados a campos | Mensagem de erro usa `aria-describedby` apontando para o campo, nunca aparece só num toast desconectado do campo |
| Tamanho de toque | Mínimo 44×44px (`--touch-target-min`) para qualquer alvo tocável |
| Independência de cor | Nunca a única informação (DS-COLOR-001, DS-BADGE-001, DS-CHART-003) |
| Responsividade com zoom | Layout suporta zoom de texto até 200% sem quebra ou corte de conteúdo |

---

## 11. Linguagem e conteúdo (implementa a seção 13.2 do Documento de Negócio)

### 11.1 Princípios de escrita de UI

- Falar como o dono da loja fala, não como um contador fala. Preferir "Comprei mercadorias" a "Lançamento de entrada"; "Quanto você pagou?" a "Valor de aquisição".
- Termos técnicos (ex.: "baixa de título", "lançamento credor") só aparecem em áreas explicitamente avançadas/configuráveis, nunca no fluxo principal.
- Perguntas diretas em vez de rótulos abstratos sempre que possível: "Quando o dinheiro entra?" em vez de "Data de vencimento".
- Mensagens de erro descrevem a ação de correção: não "Campo inválido", e sim "Informe um valor maior que zero".
- Números e datas em formato brasileiro (R$ 1.234,56 · 04/08/2026), nunca formato técnico (ISO, ponto decimal) exposto ao usuário final.

### 11.2 Tom por contexto

| Contexto | Tom |
|---|---|
| Fluxos de registro (venda, compra, despesa) | Direto, rápido, sem fricção |
| Confirmações de ação irreversível | Claro, sério, sem alarmismo |
| Estados vazios | Acolhedor, orientativo ("Vamos cadastrar seu primeiro produto?") |
| Alertas de negócio (estoque baixo, conta vencendo) | Objetivo, acionável, sem urgência artificial |
| Erros do sistema (falha técnica) | Honesto, sem jargão técnico, com próximo passo claro |

**Regra DS-CONTENT-001:** esta seção rege a **linguagem de produto** (a interface do ERP). Ela é independente do guia de tom de marca usado no marketing da MAFA Store — a interface do sistema fala "a língua do lojista", não a língua aspiracional/luxuosa usada nas campanhas de venda da loja.

---

## 12. UI condicionada por permissão (implementa a seção 9 do Documento de Negócio)

**Regra DS-PERM-001 — Ocultar, não desabilitar.** Como estabelecido em DS-NAV-001 e DS-KPI-003, qualquer elemento de UI (menu, card, coluna de tabela, campo de formulário, botão) para o qual o usuário não tem permissão **não é renderizado**, em vez de aparecer visível e bloqueado. Exceções só quando a ausência do elemento causar confusão estrutural grave (ex.: uma coluna a menos numa tabela é aceitável; um botão de "Salvar" sumindo no meio de um fluxo não é — nesse caso, a tela inteira deve ser inacessível antes mesmo de o formulário abrir).

**Regra DS-PERM-002:** a checagem de permissão na UI é sempre tratada como conveniência de experiência, nunca como controle de segurança — a regra de negócio (seção 9.7 do Documento de Negócio: "ações sensíveis deverão ser autorizadas no backend") permanece a autoridade real. O design system não substitui a validação de backend, apenas evita expor opções que o backend rejeitaria.

**Regra DS-PERM-003 — Mapeamento perfil → visão de dashboard:**

| Perfil | Vê no dashboard |
|---|---|
| Proprietário | Todos os indicadores, incluindo lucro, CMV, margem |
| Administrador | Todos, salvo os marcados como exclusivos do proprietário na configuração |
| Vendedor | Vendas, ticket médio, metas próprias — sem custo, lucro, despesas |
| Estoquista | Indicadores de estoque (baixo, zerado, em trânsito) — sem financeiro |
| Financeiro | Indicadores financeiros e de fluxo de caixa — estoque só como contexto |
| Visualizador | Réplica somente-leitura da visão do perfil equivalente que autorizou o acesso |

---

## 13. Iconografia

- Biblioteca única e consistente (ex.: Phosphor, Lucide, Tabler) — nunca misturar bibliotecas de ícones no mesmo produto.
- Peso de traço único em toda a interface (ex.: sempre "regular", nunca misturar "regular" com "bold" no mesmo contexto).
- Tamanhos padronizados: 16px (dentro de texto/badge), 20px (padrão de UI), 24px (navegação/destaque).
- Ícones de ação (editar, excluir, mais opções) sempre têm rótulo acessível mesmo quando visualmente "só ícone" (reforça a seção 10 de acessibilidade).

---

## 14. Estados de interface — checklist obrigatório por tela

Toda tela construída deve contemplar explicitamente estes 5 estados antes de ser considerada pronta (alinhado à "Definição de pronto", seção 30 do Documento de Negócio):

1. **Carregando** — skeleton, nunca tela em branco.
2. **Vazio** — orientativo, com ação (DS-TABLE-003).
3. **Preenchido (normal)** — o estado principal.
4. **Erro** — mensagem acionável, nunca só um código de erro.
5. **Sem permissão** — item omitido (DS-PERM-001), não bloqueado.

---

## 15. Relação com o Documento de Negócio — rastreabilidade

Este design system não introduz nenhuma regra de negócio nova; ele traduz em decisões visuais o que já está definido em:

- Seção 4.3 (Princípios do produto) → Seção 3 deste documento
- Seção 5.3 (Persona) e 13 (Experiência do usuário) → Seções 3.2, 7, 11
- Seção 9 (Perfis de acesso) → Seção 12
- Seção 10.17 (Dashboard) → Seção 9
- Seção 6.3 / 24 (SaaS multiempresa) → Seção 6
- Seção 14 (Requisitos não funcionais, acessibilidade) → Seção 10

Qualquer atualização no Documento de Negócio que altere módulos, perfis de acesso ou indicadores deve gerar uma revisão correspondente neste documento — especialmente nas seções 9 e 12.

---

## 16. Próximos artefatos recomendados

Para dar sequência à implementação, recomenda-se produzir, nesta ordem:

1. **Arquivo de tokens executável** (JSON ou Tailwind config) a partir da seção 4 deste documento.
2. **Biblioteca de componentes em Figma** (ou Storybook, se o time for direto para código) cobrindo a seção 8.
3. **Wireframes dos fluxos críticos** da seção 19 do Documento de Negócio (compra e recebimento, venda imediata, venda a prazo, ajuste de estoque), aplicando o padrão de wizard (8.10).
4. **Protótipo navegável do dashboard** (seção 9), incluindo os 3 perfis de acesso mais comuns (Proprietário, Vendedor, Estoquista) para validar DS-PERM-001 na prática.
5. **Guia de acessibilidade testável** (checklist WCAG AA por componente), derivado da seção 10.

---

*Fim do documento.*

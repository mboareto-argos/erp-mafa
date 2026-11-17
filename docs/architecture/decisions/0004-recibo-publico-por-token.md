# ADR-0004 — Recibo da venda público por token

## Status
Aceito (17/11/2026)

## Contexto
A BR §10.10, regra 26 (aprovada pelo proprietário), pede que o cliente abra o recibo da venda
por um link, **sem login**, para ver, baixar em PDF ou imprimir. Até aqui toda rota exigia JWT
(TA-SEC-001) e toda tabela operacional com `company_id` tinha RLS (TA-DATA-005). Sem login não
há empresa no contexto da requisição, então o RLS não deixaria encontrar a venda.

## Decisão
- Rota pública única: `GET /api/v1/public/receipts/:token` (API) e a página `/recibo/[token]`
  (web, fora do `proxy.ts` e com `noindex`). Nenhuma outra rota pública foi criada.
- Token: 32 bytes aleatórios (`crypto.randomBytes`) em base64url, criado na confirmação da
  venda. Um link ativo por venda; gerar outro (`POST /sales/:id/receipt-link {rotate:true}`,
  `manage_sales`) revoga o anterior e fica na auditoria.
- Tabela `sale_receipt_links` (token → `company_id`, `sale_id`) **sem RLS**, exceção
  documentada no mesmo molde de `invitations`: guarda só o vínculo, nenhum dado da venda.
  A API resolve a empresa pelo token e só então lê a venda dentro de `withTenant` (RLS ativo).
- A resposta pública é uma lista fechada de campos (loja, itens, totais, pagamentos, parcelas,
  nome do cliente, estado). Nunca custo, CMV, lucro, IDs internos ou dados de outras vendas.
- Venda cancelada ou devolvida continua abrindo, com o estado visível.

## Consequências
- Quem tiver o link vê aquele recibo (inclusive o nome do cliente) — equivalente a um recibo
  em papel. Mitigação: token não adivinhável, `noindex`, `Referrer-Policy: no-referrer` e
  revogação pelo usuário.
- A tabela `sale_receipt_links` fica fora da segunda camada de isolamento (RLS); o isolamento
  dela é da aplicação (todas as consultas autenticadas filtram por `company_id`), coberto pelo
  teste `pix-receipt-tenant.integration-spec.ts`.

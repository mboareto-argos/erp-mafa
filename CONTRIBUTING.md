# Contribuindo

## Antes de qualquer alteração
1. Leia `AGENTS.md`.
2. Se a alteração tocar regra de negócio, confira `docs/product/business-requirements.md`.
3. Se a alteração tocar UI, siga `docs/product/design-system.md` e o protótipo em
   `docs/product/wireframes/wireframes.html` — não introduza padrão visual novo sem
   atualizar o design system primeiro.
4. Se a alteração tocar arquitetura, stack ou modelo de dados-chave, registre um novo ADR em
   `docs/architecture/decisions/`.

## Commits e branches
- Branches curtas por história/módulo.
- Commits pequenos e rastreáveis (exigência da seção 15.3 do Documento de Negócio).

## Testes
Nenhuma história é considerada pronta sem os testes descritos em `docs/testing/test-strategy.md`,
incluindo o cenário multiempresa quando o módulo for crítico.

## Documentação
Toda nova entidade, endpoint ou regra deve atualizar o documento correspondente
(`docs/data/data-dictionary.md`, `docs/api/openapi.yaml`, `docs/architecture/overview.md`)
no mesmo PR — a documentação nunca fica "para depois".

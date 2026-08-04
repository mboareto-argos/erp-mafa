# ADR-0001 — Stack inicial do projeto

## Status
Aceito

## Contexto
O Documento de Negócio não fecha stack técnica (por escolha deliberada) e pede que essa
decisão seja registrada na documentação técnica (seção 1 e 15.3 de business-requirements.md).

## Decisão
Turborepo + Next.js + Nest.js + PostgreSQL + Prisma, conforme seção 2 de
docs/architecture/overview.md, por consistência com o ferramental já validado em outro
projeto da ArgosDev.

## Consequências
- Equipe já tem familiaridade com o stack, reduz tempo de setup.
- Nest.js impõe estrutura modular que mapeia 1:1 com os domínios da seção 16 do
  Documento de Negócio.
- Troca futura de qualquer peça do stack exige um novo ADR, não uma decisão silenciosa.

## Alternativas consideradas
- Django/Python: descartado por divergir do padrão de outros projetos da casa.
- Microsserviços desde o início: descartado — complexidade operacional desnecessária
  para o estágio atual do produto (seção 3.1 de docs/architecture/overview.md).

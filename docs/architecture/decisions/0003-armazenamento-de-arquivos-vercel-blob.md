# ADR-0003 — Armazenamento de arquivos no Vercel Blob

## Status
Aceito (16/11/2026)

## Contexto
A documentação técnica (overview.md, seção 2) prevê "object storage compatível S3 (ex.:
Cloudflare R2 ou AWS S3)" para anexos, imagens de produto e planilhas — nunca o banco. A
primeira necessidade real é a foto do produto (BR §10.3 "imagem"). O web e a API já rodam no
Vercel (plano Pro do proprietário). A regra TA-STACK-001 exige ADR para desvio da stack.

## Decisão
Usar o **Vercel Blob** (store público) para as fotos de produto:
- O arquivo vai para o Blob; o banco guarda só a URL (`products.image_url`).
- O envio passa por uma rota do web (`POST /api/catalog/products/:id/image`) que confere a
  sessão, a permissão `manage_catalog` e se o produto pertence à empresa (consultando a API
  com o token do usuário — RLS) antes de gravar. Caminho no Blob:
  `companies/<company_id>/products/<product_id>/<aleatório>.<ext>`.
- A foto é reduzida no navegador antes do envio (lado maior até 1600 px, JPEG/WebP ~80%),
  ficando bem abaixo do limite de corpo das funções do Vercel (4,5 MB) e barata de guardar.
- A API só aceita `imageUrl` do domínio `*.public.blob.vercel-storage.com` (ou `/uploads/`
  no ambiente local) — nunca uma URL externa arbitrária.
- Ao trocar ou remover a foto, o arquivo antigo é apagado do Blob.
- Sem `BLOB_READ_WRITE_TOKEN` (ambiente local em container), o web grava em
  `apps/web/public/uploads/` com a mesma interface — só para desenvolvimento.

## Consequências
- Zero infraestrutura nova: o store é criado no painel do Vercel e o token entra como
  variável de ambiente do projeto web.
- As URLs são públicas (qualquer pessoa com o link vê a foto). Aceitável para foto de
  produto; **não** usar este store para documentos sensíveis (notas, comprovantes) — esses
  pedirão store privado ou URLs assinadas num ADR próprio.
- Acoplamento ao Vercel no armazenamento. A interface de armazenamento do web é pequena
  (gravar/apagar), então trocar por R2/S3 depois é localizado.

## Alternativas consideradas
- Cloudflare R2: mais barato em volume, mas exige outra conta, credenciais e configuração
  de domínio público; sem ganho relevante no volume de uma loja pequena.
- Guardar a imagem no Postgres (bytea): descartado — a documentação técnica proíbe arquivos
  no banco e encareceria backup/branches do Neon.

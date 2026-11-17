# Runbook operacional

> A ser preenchido conforme a infraestrutura for definida (seção 14.3 do Documento de Negócio
> e seção 3.2 de docs/architecture/overview.md).

## Pendências para preencher antes do primeiro deploy em produção
- [ ] Como rodar migrations em produção
- [ ] Como restaurar um backup
- [ ] Como escalar filas (BullMQ) em caso de acúmulo
- [ ] Contatos e escalonamento em caso de incidente
- [ ] Checklist de deploy
# Operação do banco com RLS

## Credenciais

O runtime da API deve usar `DATABASE_URL` com o papel `erp_mafa_app`, que não
tem `BYPASSRLS`. `DIRECT_URL` é administrativa e só pode ser usada por Prisma
Migrate e manutenção controlada; nunca pelo processo da API.

Em ambientes novos, criar o papel antes do primeiro deploy, com senha própria
do ambiente e privilégios equivalentes aos da migration
`20260805130000_add_row_level_security`. Não reutilizar a senha local.

## Diagnóstico de isolamento

Toda requisição autenticada abre uma transação e configura
`app.current_company_id` localmente. Consultas sem esse contexto não retornam
linhas operacionais. Para validar após um deploy, executar:

```bash
pnpm --filter @erp-mafa/api test:integration
```

O cenário `rls-database-enforcement.integration-spec.ts` comprova a política no
PostgreSQL sem depender apenas do filtro da aplicação.

## Aplicar migrations em produção (Neon)

O deploy do Vercel **não** é a fonte de verdade das migrations: confira em Vercel → projeto
da API → Settings → Build & Deployment → *Build Command* se há `prisma migrate deploy`. Se não
houver, as migrations são aplicadas manualmente, seguindo esta ordem.

**Regra de ordem:** migration primeiro, código depois. Migrations deste projeto são aditivas
(colunas opcionais, tabelas e índices novos), então o código antigo continua funcionando com o
banco já migrado; o contrário (código novo com banco antigo) quebra as telas que leem a coluna
nova.

1. **Ver o que já foi aplicado.** No SQL Editor do Neon (banco de produção):
   ```sql
   select migration_name, finished_at
   from _prisma_migrations
   order by finished_at desc
   limit 5;
   ```
   Compare com as pastas em `apps/api/prisma/migrations/`. As que não aparecem são as pendentes.
2. **Backup instantâneo.** No Neon: Branches → *Create branch* a partir de `main` (produção),
   nome `backup-antes-<migration>`. É uma cópia do banco naquele instante; dá para voltar a ela
   se algo der errado.
3. **Aplicar.** Com o ambiente local de pé (`docker compose up -d`), usando a connection string
   **administrativa** do Neon (a mesma de `DIRECT_URL`, nunca a do papel `erp_mafa_app`):
   ```bash
   docker compose exec app sh -c 'cd apps/api && DATABASE_URL="<url-admin-neon>" DIRECT_URL="<url-admin-neon>" npx prisma migrate deploy'
   ```
   A saída lista cada migration aplicada e termina com *All migrations have been successfully applied*.
4. **Conferir.** Repita o passo 1: a migration nova deve aparecer com `finished_at` preenchido.
5. **Publicar o código.** Só agora faça o merge do PR (o Vercel publica a API e o web).
6. **Limpar.** Depois de alguns dias sem problemas, apague a branch de backup no Neon.

Se o passo 3 falhar no meio, nada do código novo foi publicado ainda: corrija e rode de novo
(`migrate deploy` só aplica o que falta) ou restaure a branch de backup.

## Fotos de produto (Vercel Blob — ADR-0003)

Configuração única, no painel do Vercel:

1. **Storage → Create → Blob**, nome `erp-mafa-fotos`, acesso **público**.
2. **Connect Project** → projeto **web** (`erp-mafa-web`), marcando Production e Preview.
   O Vercel cria no projeto web `BLOB_STORE_ID` (e `BLOB_WEBHOOK_PUBLIC_KEY`); o SDK autentica
   sozinho com o token OIDC do deploy. Stores antigos criavam `BLOB_READ_WRITE_TOKEN` — os dois
   formatos funcionam. A API não precisa de nenhuma delas.
3. **Faça um novo deploy do web** (Redeploy ou o merge do PR): variáveis novas só valem para
   deploys feitos depois de criadas.

Sem o store conectado, o resto do app funciona normalmente; só o envio de foto responde
"O armazenamento de fotos não está configurado…".

- Caminho dos arquivos: `companies/<company_id>/products/<product_id>/<aleatório>.jpg`.
- A foto chega reduzida pelo celular (lado maior 1600 px, JPEG ~80%), ~100–400 KB cada.
- Trocar ou remover a foto apaga o arquivo antigo do Blob.
- As URLs são públicas: não usar este store para documentos sensíveis.
- Ambiente local sem store conectado: as fotos vão para `apps/web/public/uploads/` (ignorado pelo Git).

## Domínio do app (app.argosdev.com.br)

O site (projeto **web** na Vercel) responde em `app.argosdev.com.br`. A API continua no
endereço dela: o site chama a API pelo servidor (`API_BASE_URL`), sem CORS, então nada na API
muda com o domínio.

1. **Vercel → projeto web → Settings → Domains → Add**: `app.argosdev.com.br`.
   - A Vercel mostra o registro DNS a criar. Normalmente é um **CNAME** `app` →
     `cname.vercel-dns.com`; às vezes ela mostra um valor próprio do projeto. **Use exatamente
     o valor que a Vercel mostrar.**
2. **No DNS de argosdev.com.br** (no Registro.br ou onde o DNS estiver hospedado): criar o
   CNAME `app` com o valor da Vercel. Não mexer nos registros que já existem (site, e-mail).
3. Esperar a Vercel marcar o domínio como **Valid Configuration**. O certificado HTTPS é
   emitido sozinho, em alguns minutos.
4. **Variável de ambiente:** se existir `NEXT_PUBLIC_APP_NAME` no projeto web, remover ou
   trocar para `Vendaí` (ela sobrescreve o nome do app instalado). Depois, **Redeploy**.
5. **Opcional — gestao.mafastore.com.br:** no mesmo projeto, adicionar
   `gestao.mafastore.com.br`, escolher **Redirect to `app.argosdev.com.br`** (308) e criar o
   CNAME `gestao` no DNS de mafastore.com.br com o valor indicado pela Vercel.

Depois da troca:

- O endereço antigo `*.vercel.app` continua funcionando.
- O login vale por endereço: no domínio novo é preciso entrar de novo uma vez.
- O app instalado no celular fica preso ao endereço em que foi instalado. Para ter o ícone e
  o nome novos: remover o ícone antigo, abrir `app.argosdev.com.br` e instalar de novo
  (Android: menu → Instalar app; iPhone: Compartilhar → Adicionar à Tela de Início).

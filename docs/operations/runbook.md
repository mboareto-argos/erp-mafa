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

#!/usr/bin/env bash
# Sobe o ambiente local completo dentro do container "app":
# instala dependências, prepara apps/api/.env, aplica migrations, roda o seed
# de papéis e inicia web (3000) + api (3001) em modo watch.
#
# Ambiente 100% local: nunca aponta para o banco de produção (Neon).
set -euo pipefail
cd /workspace

echo "==> Instalando dependências (pnpm install)"
pnpm install --frozen-lockfile

ENV_FILE=apps/api/.env
if [ ! -f "$ENV_FILE" ]; then
  echo "==> Criando $ENV_FILE a partir de .env.example (JWT_SECRET aleatório)"
  secret=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed "s/replace-with-a-random-secret/${secret}/" apps/api/.env.example > "$ENV_FILE"
fi

echo "==> Aguardando Postgres"
until pg_isready -h localhost -p 5432 -U postgres >/dev/null 2>&1; do sleep 1; done

echo "==> Aplicando migrations e seed de papéis"
pnpm --filter @erp-mafa/api exec prisma migrate deploy
pnpm --filter @erp-mafa/api exec prisma db seed

echo "==> Iniciando web (http://localhost:3000) e api (http://localhost:3001/api/v1)"
# Web roda com webpack + polling no container: o Turbopack não detecta
# mudanças de arquivo vindas do macOS via virtiofs (hot reload não funciona).
# Fora do container, `pnpm dev` (Turbopack) continua sendo o padrão.
trap 'kill 0' EXIT
pnpm --filter @erp-mafa/api dev &
WATCHPACK_POLLING=true pnpm --filter @erp-mafa/web dev:container &
wait -n

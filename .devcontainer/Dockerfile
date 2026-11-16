# Imagem de desenvolvimento local do ERP MAFA (web + api no mesmo container).
# Usada pelo docker-compose.yml da raiz (serviço "app") e pelo
# .devcontainer/devcontainer.json. Nunca usada em produção (produção = Vercel).
FROM node:22-bookworm-slim

# openssl: exigido pelos engines do Prisma; git/procps: conforto no terminal.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates git procps postgresql-client \
  && rm -rf /var/lib/apt/lists/*

# Mesma versão de pnpm do "packageManager" da raiz (package.json).
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

ENV PNPM_HOME=/pnpm \
  npm_config_store_dir=/pnpm-store \
  NEXT_TELEMETRY_DISABLED=1

WORKDIR /workspace

# syntax=docker/dockerfile:1
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# Tools: bun + pnpm (corepack)
RUN apt-get update -qq \
  && apt-get install --no-install-recommends -y curl ca-certificates unzip bash \
  && curl -fsSL https://bun.sh/install | bash \
  && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

# (Optionnel mais recommandé) store local => pas de surprise
RUN pnpm config set store-dir /app/.pnpm-store

# Workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install deps (sur Linux, avec store présent dans l'image)
RUN pnpm install --frozen-lockfile

# Sources
COPY apps/api apps/api
COPY packages/shared packages/shared

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
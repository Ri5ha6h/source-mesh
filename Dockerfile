FROM node:24-bookworm-slim@sha256:39a4259b6f744868a8228742ad45aa3026f97302e5eec2fa4a38b30ca0a66e12 AS tooling
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
ENV MIGRATION_DATABASE_URL=postgresql://source_mesh:dummy-local-only@postgres:5432/source_mesh
RUN apt-get update && apt-get install --yes --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .oxfmtrc.json .oxlintrc.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/e2e/package.json apps/e2e/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/integrations/package.json packages/integrations/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile
COPY apps ./apps
COPY packages ./packages

FROM tooling AS development
CMD ["pnpm", "dev"]

FROM tooling AS test
CMD ["pnpm", "test"]

FROM tooling AS api-build
RUN pnpm --filter @source-mesh/api build && pnpm --filter @source-mesh/api deploy --prod /prod/api

FROM cgr.dev/chainguard/node:latest@sha256:381ba71f0fff9a91e7bccfc5260eeb626723563e7eeb710882861c4e641ad992 AS api-production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=api-build --chown=65532:65532 /prod/api ./
USER 65532
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["/usr/bin/node", "-e", "fetch('http://localhost:4000/health').then(r=>{if(!r.ok)process.exit(1)})"]
CMD ["dist/main.js"]

FROM tooling AS web-build
RUN pnpm --filter @source-mesh/web build

FROM cgr.dev/chainguard/node:latest@sha256:381ba71f0fff9a91e7bccfc5260eeb626723563e7eeb710882861c4e641ad992 AS web-production
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=web-build --chown=65532:65532 /workspace/apps/web/.next/standalone ./
COPY --from=web-build --chown=65532:65532 /workspace/apps/web/.next/static ./apps/web/.next/static
USER 65532
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["/usr/bin/node", "-e", "fetch('http://localhost:3000/login').then(r=>{if(!r.ok)process.exit(1)})"]
CMD ["apps/web/server.js"]

FROM mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48 AS e2e
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/e2e/package.json apps/e2e/package.json
RUN pnpm install --frozen-lockfile --filter @source-mesh/e2e...
COPY apps/e2e ./apps/e2e
CMD ["pnpm", "--filter", "@source-mesh/e2e", "test"]

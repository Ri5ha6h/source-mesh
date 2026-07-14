# Source Mesh

Source Mesh is a containerized, dummy-data proof of concept for governed shipment-data capture,
normalization, tenant mapping, and delivery. The current POC establishes identity, explicit
platform and workspace contexts, tenant onboarding, isolated provider configuration, capability
enforcement, tenant-scoped repositories, and PostgreSQL row-level security.

The POC makes no runtime calls to real carriers, production systems, or external AI providers.
Real-data adapters remain out of scope until automated testing, manual review, and client acceptance
are complete.

## Host requirements

- Git
- Docker Desktop or Docker Engine
- Docker Compose v2

Node.js, pnpm, Python, PostgreSQL, Redis, MinIO, Keycloak, Playwright, and scanners run inside
containers. No host language runtime or package manager is required.

## Start the POC

```sh
./scripts/poc bootstrap
./scripts/poc demo
```

Open [http://localhost:3000](http://localhost:3000). The ignored manual-testing credential sheet is
at `phase/dummy-users.md`; it contains every synthetic username, email, password, role, and expected
landing context.

Use `./scripts/poc reset` after identity-realm changes or whenever a deterministic clean seed is
needed. Reset removes only Source Mesh Compose volumes, rebuilds the environment, applies Drizzle
migrations, and restores the same synthetic records.

## Container-only commands

| Command                   | Purpose                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| `./scripts/poc bootstrap` | Build, start infrastructure, migrate, seed, and start all POC services |
| `./scripts/poc up`        | Start the existing environment and wait for health checks              |
| `./scripts/poc seed`      | Restore deterministic application seed records                         |
| `./scripts/poc test`      | Reseed, then run formatting, lint, types, tests, and Playwright        |
| `./scripts/poc audit`     | Run dependency, secret, filesystem, image, and SBOM gates              |
| `./scripts/poc demo`      | Show service health and local URLs                                     |
| `./scripts/poc down`      | Stop services without deleting their volumes                           |
| `./scripts/poc reset`     | Delete POC volumes, rebuild, migrate, reseed, and restart              |

## POC architecture

- `apps/web`: one Next.js application, one `/login` entry, and one authenticated shell.
- `apps/api`: a NestJS modular monolith with thin HTTP adapters around Effect application services.
- `apps/worker-python`: an independently deployable Python crawl-worker boundary.
- `packages/database`: Drizzle schemas, migrations, deterministic seed data, and PostgreSQL access.
- `packages/ui`: repository-owned shadcn/ui primitives backed by Base UI and the shared Source Mesh
  brand lockup.
- `infra/keycloak`: a fully synthetic local OIDC realm containing the five Phase 1 identities.

Platform routes live under `/app/platform/*`; tenant routes live under
`/app/workspaces/:tenantSlug/*`. Tenant authority is checked at the route, API, application,
repository, and PostgreSQL RLS boundaries. Platform Admin does not inherit `mapping:publish`; only a
named Platform Approver has that capability.

The authenticated shell keeps each responsibility on a focused route. Platform identities receive
an overview plus capability-specific onboarding or approvals navigation. Workspace identities
receive overview, carriers, and investigations routes; configuration and workspace settings appear
only when the session has the corresponding server-computed capabilities.

Phase 2 adds a platform tenant registry and tenant-scoped Logistics / Ocean manifests. The
deterministic seed gives Acme Europe an MSC connector with JSON download output, while Northstar
Logistics receives a Maersk connector with an XML dummy webhook. Credentials are write-only values
in a permission-restricted Docker volume; PostgreSQL contains opaque references and configuration
responses expose only `configured` or `missing` status.

## Toolchain and dependency policy

- pnpm uses exact versions, a seven-day minimum release age, strict publication-time checks, frozen
  lockfiles, trust-downgrade protection, and blocked exotic transitive sources.
- Oxlint and Oxfmt are the only JavaScript/TypeScript linting and formatting tools.
- Drizzle is the only TypeScript ORM/schema migration layer.
- Effect Schema is the canonical shared TypeScript runtime schema system; Zod is not used.
- UI primitives use the full shadcn/ui source-owned component structure, Tailwind theme tokens, and
  `data-slot` composition. Interactive Button and Checkbox controls are backed by Base UI 1.6.0;
  semantic Input, Card, Table, Field, Badge, and Native Select components follow the official
  shadcn composition model. Radix UI is not installed.
- Production application images run as non-root users on minimal runtimes.

## Phase workflow

Each phase remains uncommitted while automated evidence and the manual-review packet are prepared.
After explicit manual approval, that phase is committed, pushed, and held until remote CI is green.
Only then may the next phase begin. Local phase ledgers and generated evidence remain ignored under
`phase/` and `artifacts/`.

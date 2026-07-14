# Source Mesh agent rules

These rules apply to the entire repository.

## Canonical references

- Use `design/foundation.md` for product language, design tokens, UI behavior, authentication shape, and Effect boundaries.
- Use `research/poc-preview.html` for the adopted POC architecture, phases, public interfaces, security gates, and definition of done.
- Use `design/home/home-03-data-lineage.html` and `design/dashboard/dashboard-02-search-first.html` as the visual baselines.
- Treat `research/gpt-poc-report.md` as supporting market and architecture research. When it conflicts with an adopted decision, the foundation and POC blueprint win.

## Architecture invariants

- Provide one OIDC entry at `/login` and one authenticated application shell.
- Keep platform and tenant contexts explicit through `/app/platform/*` and `/app/workspaces/:tenantSlug/*`.
- Do not create separate admin and tenant applications, login routes, or component systems.
- Keep the POC backend a NestJS modular monolith plus independently deployed Python crawl workers. Do not introduce a microservice fleet without measured scaling, isolation, compliance, or ownership evidence.
- Keep tenant context on every tenant-owned request, query, record, job, artifact, cache key, metric, and log.

## Authorization and safety

- UI visibility is never authorization. Enforce capabilities in NestJS guards, Effect application services, tenant-scoped repositories, and database policies.
- Initial roles are Platform Admin, Platform Approver, Tenant Admin, Tenant Operator, and Tenant Viewer. Users may hold multiple platform and membership roles.
- Do not grant `mapping:publish` to Platform Admin implicitly. Publishing requires the Platform Approver capability.
- Never trust a workspace ID supplied only in a body, query, or client state. Verify the route context, session membership, capability, and data scope.
- AI may investigate and propose mapping changes but may not publish them. A named human approver owns publication.
- Do not weaken tenant isolation, auditability, approval, redaction, or idempotency to accelerate the POC.

## TypeScript and Effect

- Use Effect Schema as the canonical runtime schema system for shared TypeScript contracts. Do not create parallel Zod definitions.
- Implement TypeScript use cases and integrations with typed Effect errors, services, Layers, configuration, retry/timeout policies, and OpenTelemetry instrumentation.
- Keep NestJS controllers and BullMQ processors as thin adapters around the Effect application core.
- Keep short-lived Effect retries distinct from durable BullMQ retries to avoid multiplying attempts.
- Keep React conventional; use TanStack Query for browser server-state. Keep crawl implementations in Python.
- Do not adopt Effect Cluster or Workflows during the POC while they remain alpha.

## Change discipline

- Preserve unrelated user changes and do not rewrite research citations without a specific reason.
- Update the foundation, blueprint, selected prototypes, and this file together when an architectural invariant changes.
- Add unit, integration, end-to-end, cross-tenant isolation, and capability-bypass tests in proportion to each change.
- Verify desktop and mobile behavior, keyboard focus, reduced motion, semantic status labels, and empty/error states for UI work.

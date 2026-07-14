ALTER TABLE "tenants" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
CREATE TABLE "tenant_domains" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "domain" TEXT NOT NULL, "mode" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT "tenant_domains_tenantId_domain_mode_key" UNIQUE ("tenantId", "domain", "mode")
);
--> statement-breakpoint
CREATE TABLE "secret_references" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL, "opaqueRef" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'configured',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "secret_references_tenantId_name_key" UNIQUE ("tenantId", "name")
);
--> statement-breakpoint
CREATE TABLE "provider_configurations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "providerCode" TEXT NOT NULL, "displayName" TEXT NOT NULL, "referenceTypes" TEXT[] NOT NULL,
  "secretReferenceId" UUID REFERENCES "secret_references"("id") ON DELETE RESTRICT, "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "provider_configurations_tenantId_providerCode_key" UNIQUE ("tenantId", "providerCode")
);
--> statement-breakpoint
CREATE TABLE "crawl_schedules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "providerId" UUID NOT NULL REFERENCES "provider_configurations"("id") ON DELETE CASCADE,
  "cron" TEXT NOT NULL, "timezone" TEXT NOT NULL DEFAULT 'UTC', "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "crawl_schedules_tenantId_providerId_key" UNIQUE ("tenantId", "providerId")
);
--> statement-breakpoint
CREATE TABLE "tenant_limits" (
  "tenantId" UUID PRIMARY KEY REFERENCES "tenants"("id") ON DELETE CASCADE,
  "requestsPerMinute" INTEGER NOT NULL, "concurrentCrawls" INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_destinations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL, "type" TEXT NOT NULL, "endpoint" TEXT, "format" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "delivery_destinations_tenantId_name_key" UNIQUE ("tenantId", "name")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL, "role" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
  "invitedBy" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "expiresAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "invitations_tenantId_email_key" UNIQUE ("tenantId", "email")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "actorUserId" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL, "resourceId" TEXT NOT NULL, "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX "audit_events_tenantId_createdAt_idx" ON "audit_events"("tenantId", "createdAt");
--> statement-breakpoint
ALTER TABLE "tenant_domains" ENABLE ROW LEVEL SECURITY; ALTER TABLE "tenant_domains" FORCE ROW LEVEL SECURITY;
ALTER TABLE "secret_references" ENABLE ROW LEVEL SECURITY; ALTER TABLE "secret_references" FORCE ROW LEVEL SECURITY;
ALTER TABLE "provider_configurations" ENABLE ROW LEVEL SECURITY; ALTER TABLE "provider_configurations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "crawl_schedules" ENABLE ROW LEVEL SECURITY; ALTER TABLE "crawl_schedules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_limits" ENABLE ROW LEVEL SECURITY; ALTER TABLE "tenant_limits" FORCE ROW LEVEL SECURITY;
ALTER TABLE "delivery_destinations" ENABLE ROW LEVEL SECURITY; ALTER TABLE "delivery_destinations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY; ALTER TABLE "invitations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY; ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_scope ON "tenant_domains" USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_scope ON "secret_references" USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_scope ON "provider_configurations" USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_scope ON "crawl_schedules" USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_scope ON "tenant_limits" USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_scope ON "delivery_destinations" USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_scope ON "invitations" USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_scope ON "audit_events" USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

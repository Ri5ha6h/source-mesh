CREATE TABLE "users" (
  "id" UUID PRIMARY KEY,
  "issuer" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT "users_issuer_subject_key" UNIQUE ("issuer", "subject")
);
--> statement-breakpoint
CREATE TABLE "platform_role_assignments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "grantedBy" TEXT NOT NULL,
  CONSTRAINT "platform_role_assignments_userId_role_key" UNIQUE ("userId", "role")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
  "id" UUID PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "user_memberships" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT "user_memberships_userId_tenantId_role_key" UNIQUE ("userId", "tenantId", "role")
);
--> statement-breakpoint
CREATE INDEX "user_memberships_tenantId_idx" ON "user_memberships"("tenantId");
--> statement-breakpoint
CREATE TABLE "user_preferences" (
  "userId" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "contextType" TEXT NOT NULL,
  "tenantId" UUID REFERENCES "tenants"("id") ON DELETE SET NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "workspace_notes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "message" TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX "workspace_notes_tenantId_idx" ON "workspace_notes"("tenantId");
--> statement-breakpoint
ALTER TABLE "user_memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_memberships" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_preferences" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workspace_notes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workspace_notes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY membership_self_or_tenant ON "user_memberships" FOR SELECT
USING (
  "userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
--> statement-breakpoint
CREATE POLICY preference_self ON "user_preferences"
USING ("userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
WITH CHECK ("userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY workspace_note_tenant ON "workspace_notes"
USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO source_mesh_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO source_mesh_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO source_mesh_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO source_mesh_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO source_mesh_app;

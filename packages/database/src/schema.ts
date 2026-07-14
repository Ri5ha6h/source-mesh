import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey(),
    issuer: text().notNull(),
    subject: text().notNull(),
    email: text().notNull().unique(),
    displayName: text('displayName').notNull(),
    status: text().notNull().default('active'),
  },
  (table) => [unique('users_issuer_subject_key').on(table.issuer, table.subject)],
);

export const platformRoleAssignments = pgTable(
  'platform_role_assignments',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text().notNull(),
    status: text().notNull().default('active'),
    grantedBy: text('grantedBy').notNull(),
  },
  (table) => [unique('platform_role_assignments_userId_role_key').on(table.userId, table.role)],
);

export const tenants = pgTable('tenants', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  status: text().notNull().default('active'),
});

export const userMemberships = pgTable(
  'user_memberships',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenantId')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role: text().notNull(),
    status: text().notNull().default('active'),
  },
  (table) => [
    unique('user_memberships_userId_tenantId_role_key').on(
      table.userId,
      table.tenantId,
      table.role,
    ),
    index('user_memberships_tenantId_idx').on(table.tenantId),
  ],
);

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  contextType: text('contextType').notNull(),
  tenantId: uuid('tenantId').references(() => tenants.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceNotes = pgTable(
  'workspace_notes',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenantId')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    message: text().notNull(),
  },
  (table) => [index('workspace_notes_tenantId_idx').on(table.tenantId)],
);

export const tenantDomains = pgTable(
  'tenant_domains',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenantId')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    domain: text().notNull(),
    mode: text().notNull(),
    status: text().notNull().default('active'),
  },
  (table) => [
    unique('tenant_domains_tenantId_domain_mode_key').on(table.tenantId, table.domain, table.mode),
  ],
);

export const secretReferences = pgTable(
  'secret_references',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenantId')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    opaqueRef: text('opaqueRef').notNull(),
    status: text().notNull().default('configured'),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('secret_references_tenantId_name_key').on(table.tenantId, table.name)],
);

export const providerConfigurations = pgTable(
  'provider_configurations',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenantId')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    providerCode: text('providerCode').notNull(),
    displayName: text('displayName').notNull(),
    referenceTypes: text('referenceTypes').array().notNull(),
    secretReferenceId: uuid('secretReferenceId').references(() => secretReferences.id, {
      onDelete: 'restrict',
    }),
    enabled: boolean().notNull().default(true),
  },
  (table) => [
    unique('provider_configurations_tenantId_providerCode_key').on(
      table.tenantId,
      table.providerCode,
    ),
  ],
);

export const crawlSchedules = pgTable(
  'crawl_schedules',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenantId')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    providerId: uuid('providerId')
      .notNull()
      .references(() => providerConfigurations.id, { onDelete: 'cascade' }),
    cron: text().notNull(),
    timezone: text().notNull().default('UTC'),
    enabled: boolean().notNull().default(true),
  },
  (table) => [
    unique('crawl_schedules_tenantId_providerId_key').on(table.tenantId, table.providerId),
  ],
);

export const tenantLimits = pgTable('tenant_limits', {
  tenantId: uuid('tenantId')
    .primaryKey()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  requestsPerMinute: integer('requestsPerMinute').notNull(),
  concurrentCrawls: integer('concurrentCrawls').notNull(),
});

export const deliveryDestinations = pgTable(
  'delivery_destinations',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenantId')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    type: text().notNull(),
    endpoint: text(),
    format: text().notNull(),
    enabled: boolean().notNull().default(true),
  },
  (table) => [unique('delivery_destinations_tenantId_name_key').on(table.tenantId, table.name)],
);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenantId')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text().notNull(),
    role: text().notNull(),
    status: text().notNull().default('pending'),
    invitedBy: uuid('invitedBy')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  },
  (table) => [unique('invitations_tenantId_email_key').on(table.tenantId, table.email)],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenantId')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actorUserId')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    action: text().notNull(),
    resourceType: text('resourceType').notNull(),
    resourceId: text('resourceId').notNull(),
    metadata: jsonb().notNull().default({}),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_events_tenantId_createdAt_idx').on(table.tenantId, table.createdAt)],
);

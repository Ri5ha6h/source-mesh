import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

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
  id: uuid().primaryKey(),
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

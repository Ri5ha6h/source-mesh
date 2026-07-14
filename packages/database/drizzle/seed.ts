import { createDatabase } from '../src/index.js';
import {
  platformRoleAssignments,
  tenants,
  userMemberships,
  userPreferences,
  users,
  workspaceNotes,
} from '../src/schema.js';

const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (!migrationUrl) throw new Error('MIGRATION_DATABASE_URL is required');

const { db, pool } = createDatabase(migrationUrl);
const issuer = process.env.KEYCLOAK_ISSUER_PUBLIC ?? 'http://localhost:8080/realms/source-mesh';

const dummyUsers = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    displayName: 'Avery Admin',
    email: 'avery.admin@example.test',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    displayName: 'Rina Approver',
    email: 'rina.approver@example.test',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    displayName: 'Tomas Tenant',
    email: 'tomas.admin@example.test',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    displayName: 'Priya Operator',
    email: 'priya.operator@example.test',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    displayName: 'Victor Viewer',
    email: 'victor.viewer@example.test',
  },
] as const;

const acmeId = '20000000-0000-4000-8000-000000000001';
const northstarId = '20000000-0000-4000-8000-000000000002';

await db.transaction(async (tx) => {
  for (const user of dummyUsers) {
    await tx
      .insert(users)
      .values({ ...user, issuer, subject: user.id, status: 'active' })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          displayName: user.displayName,
          email: user.email,
          issuer,
          subject: user.id,
          status: 'active',
        },
      });
  }

  await tx
    .insert(tenants)
    .values([
      { id: acmeId, slug: 'acme-europe', name: 'Acme Europe' },
      { id: northstarId, slug: 'northstar-logistics', name: 'Northstar Logistics' },
    ])
    .onConflictDoNothing();

  for (const [userId, role] of [
    [dummyUsers[0].id, 'platform_admin'],
    [dummyUsers[1].id, 'platform_approver'],
    [dummyUsers[3].id, 'platform_approver'],
  ] as const) {
    await tx
      .insert(platformRoleAssignments)
      .values({ userId, role, status: 'active', grantedBy: 'phase-one-seed' })
      .onConflictDoUpdate({
        target: [platformRoleAssignments.userId, platformRoleAssignments.role],
        set: { status: 'active' },
      });
  }

  for (const [userId, tenantId, role] of [
    [dummyUsers[2].id, acmeId, 'tenant_admin'],
    [dummyUsers[3].id, acmeId, 'tenant_operator'],
    [dummyUsers[3].id, northstarId, 'tenant_operator'],
    [dummyUsers[4].id, northstarId, 'tenant_viewer'],
  ] as const) {
    await tx
      .insert(userMemberships)
      .values({ userId, tenantId, role, status: 'active' })
      .onConflictDoUpdate({
        target: [userMemberships.userId, userMemberships.tenantId, userMemberships.role],
        set: { status: 'active' },
      });
  }

  await tx
    .insert(userPreferences)
    .values({ userId: dummyUsers[4].id, contextType: 'workspace', tenantId: acmeId })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { contextType: 'workspace', tenantId: acmeId, updatedAt: new Date() },
    });

  await tx.delete(workspaceNotes);
  await tx.insert(workspaceNotes).values([
    { tenantId: acmeId, message: 'Acme synthetic workspace is isolated.' },
    { tenantId: northstarId, message: 'Northstar synthetic workspace is isolated.' },
  ]);
});

await pool.end();

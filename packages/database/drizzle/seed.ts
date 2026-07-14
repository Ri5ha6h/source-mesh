import { createDatabase } from '../src/index.js';
import { notInArray } from 'drizzle-orm';
import {
  auditEvents,
  crawlSchedules,
  deliveryDestinations,
  invitations,
  platformRoleAssignments,
  providerConfigurations,
  secretReferences,
  tenantDomains,
  tenantLimits,
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

  const acmeSecretId = '30000000-0000-4000-8000-000000000001';
  const northstarSecretId = '30000000-0000-4000-8000-000000000002';
  const acmeProviderId = '40000000-0000-4000-8000-000000000001';
  const northstarProviderId = '40000000-0000-4000-8000-000000000002';

  await tx.delete(tenants).where(notInArray(tenants.id, [acmeId, northstarId]));
  await tx.delete(auditEvents);
  await tx.delete(invitations);
  await tx.delete(deliveryDestinations);
  await tx.delete(crawlSchedules);
  await tx.delete(providerConfigurations);
  await tx.delete(secretReferences);
  await tx.delete(tenantDomains);
  await tx.delete(tenantLimits);

  await tx.insert(tenantDomains).values([
    { tenantId: acmeId, domain: 'logistics', mode: 'ocean' },
    { tenantId: northstarId, domain: 'logistics', mode: 'ocean' },
  ]);

  await tx.insert(secretReferences).values([
    {
      id: acmeSecretId,
      tenantId: acmeId,
      name: 'msc-dummy-credentials',
      opaqueRef: 'volume://acme-europe/msc',
    },
    {
      id: northstarSecretId,
      tenantId: northstarId,
      name: 'maersk-dummy-credentials',
      opaqueRef: 'volume://northstar-logistics/maersk',
    },
  ]);

  await tx.insert(providerConfigurations).values([
    {
      id: acmeProviderId,
      tenantId: acmeId,
      providerCode: 'msc',
      displayName: 'MSC dummy connector',
      referenceTypes: ['container', 'booking'],
      secretReferenceId: acmeSecretId,
    },
    {
      id: northstarProviderId,
      tenantId: northstarId,
      providerCode: 'maersk',
      displayName: 'Maersk dummy connector',
      referenceTypes: ['container'],
      secretReferenceId: northstarSecretId,
    },
  ]);

  await tx.insert(crawlSchedules).values([
    { tenantId: acmeId, providerId: acmeProviderId, cron: '*/15 * * * *', timezone: 'UTC' },
    {
      tenantId: northstarId,
      providerId: northstarProviderId,
      cron: '*/30 * * * *',
      timezone: 'Europe/Copenhagen',
    },
  ]);

  await tx.insert(tenantLimits).values([
    { tenantId: acmeId, requestsPerMinute: 24, concurrentCrawls: 4 },
    { tenantId: northstarId, requestsPerMinute: 12, concurrentCrawls: 2 },
  ]);

  await tx.insert(deliveryDestinations).values([
    { tenantId: acmeId, name: 'Acme Europe download', type: 'download', format: 'json' },
    {
      tenantId: northstarId,
      name: 'Northstar Logistics webhook',
      type: 'webhook',
      endpoint: 'http://dummy-boundary:8100/webhooks/northstar',
      format: 'xml',
    },
  ]);

  await tx.insert(invitations).values({
    tenantId: acmeId,
    email: 'new.operator@example.test',
    role: 'tenant_operator',
    invitedBy: dummyUsers[2].id,
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  });

  await tx.insert(auditEvents).values([
    {
      tenantId: acmeId,
      actorUserId: dummyUsers[2].id,
      action: 'provider.configured',
      resourceType: 'provider',
      resourceId: acmeProviderId,
      metadata: { providerCode: 'msc', synthetic: true },
    },
    {
      tenantId: northstarId,
      actorUserId: dummyUsers[0].id,
      action: 'provider.configured',
      resourceType: 'provider',
      resourceId: northstarProviderId,
      metadata: { providerCode: 'maersk', synthetic: true },
    },
  ]);
});

await pool.end();

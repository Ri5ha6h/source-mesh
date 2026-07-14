import {
  AuthorizationError,
  ConfigurationError,
  ContextMismatchError,
} from '@source-mesh/contracts';
import {
  auditEvents,
  crawlSchedules,
  createDatabase,
  deliveryDestinations,
  invitations,
  providerConfigurations,
  secretReferences,
  tenantLimits,
  userMemberships,
} from '@source-mesh/database';
import { eq, sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { ConfigurationRepository } from '../../src/configuration/configuration.repository.js';
import { VolumeSecretStore } from '../../src/configuration/secret-store.js';

const issuer = process.env.KEYCLOAK_ISSUER_PUBLIC ?? 'http://localhost:8080/realms/source-mesh';
const identity = (subject: string, email: string) => ({
  issuer,
  subject,
  email,
  displayName: subject,
});
const avery = identity('10000000-0000-4000-8000-000000000001', 'avery.admin@example.test');
const tomas = identity('10000000-0000-4000-8000-000000000003', 'tomas.admin@example.test');
const priya = identity('10000000-0000-4000-8000-000000000004', 'priya.operator@example.test');
const victor = identity('10000000-0000-4000-8000-000000000005', 'victor.viewer@example.test');
const repository = new ConfigurationRepository(new VolumeSecretStore());
const database = createDatabase();

afterAll(() => database.pool.end());

describe('tenant onboarding and configuration isolation', () => {
  it('enforces platform lifecycle authorization, duplicates, and transitions', async () => {
    const directory = await repository.listTenants(avery);
    expect(directory.tenants.map(({ name }) => name)).toContain('Acme Europe');
    await expect(repository.listTenants(priya)).rejects.toEqual(
      new AuthorizationError({ capability: 'tenant:manage' }),
    );
    await expect(
      repository.createTenant(avery, { name: 'Acme duplicate', slug: 'acme-europe' }),
    ).rejects.toEqual(new ConfigurationError({ reason: 'duplicate_tenant' }));
    await expect(
      repository.transitionTenant(avery, 'acme-europe', { status: 'active' }),
    ).rejects.toEqual(new ConfigurationError({ reason: 'invalid_transition' }));
  });

  it('returns visibly different tenant manifests without credentials', async () => {
    const [acme, northstar] = await Promise.all([
      repository.configuration(priya, 'acme-europe'),
      repository.configuration(priya, 'northstar-logistics'),
    ]);
    expect(acme).toMatchObject({
      providers: [{ providerCode: 'msc', secretStatus: 'configured' }],
      limits: { requestsPerMinute: 24 },
    });
    expect(northstar).toMatchObject({
      providers: [{ providerCode: 'maersk', secretStatus: 'configured' }],
      limits: { requestsPerMinute: 12 },
    });
    expect(JSON.stringify([acme, northstar])).not.toMatch(
      /opaqueRef|credential|dummy-msc-placeholder/,
    );
    await expect(new VolumeSecretStore().has('volume://acme-europe/missing')).resolves.toBe(false);
  });

  it('denies cross-tenant reads and configuration capability bypasses', async () => {
    await expect(repository.configuration(victor, 'acme-europe')).rejects.toEqual(
      new ContextMismatchError({ resource: 'workspace' }),
    );
    await expect(
      repository.configure(priya, 'acme-europe', {
        providerCode: 'msc',
        displayName: 'Denied',
        referenceTypes: ['container'],
        credential: 'placeholder',
        cadence: '*/15 * * * *',
        timezone: 'UTC',
        requestsPerMinute: 10,
        concurrentCrawls: 2,
        destinationType: 'download',
        destinationFormat: 'json',
      }),
    ).rejects.toEqual(new AuthorizationError({ capability: 'workspace:configure' }));
    await expect(
      repository.invite(priya, 'acme-europe', {
        email: 'denied@example.test',
        role: 'tenant_viewer',
      }),
    ).rejects.toEqual(new AuthorizationError({ capability: 'member:manage' }));
  });

  it('rejects unsupported provider references, duplicate invitations, and RLS tampering', async () => {
    await expect(
      repository.configure(tomas, 'acme-europe', {
        providerCode: 'maersk',
        displayName: 'Invalid Maersk',
        referenceTypes: ['booking'],
        credential: 'placeholder',
        cadence: '*/15 * * * *',
        timezone: 'UTC',
        requestsPerMinute: 10,
        concurrentCrawls: 2,
        destinationType: 'webhook',
        destinationFormat: 'json',
      }),
    ).rejects.toEqual(new ConfigurationError({ reason: 'invalid_configuration' }));
    await expect(
      repository.invite(tomas, 'acme-europe', {
        email: 'new.operator@example.test',
        role: 'tenant_viewer',
      }),
    ).rejects.toEqual(new ConfigurationError({ reason: 'duplicate_invitation' }));
    const hidden = await database.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.current_tenant_id', ${'20000000-0000-4000-8000-000000000001'}, true)`,
      );
      const northstarId = '20000000-0000-4000-8000-000000000002';
      return [
        await tx
          .select()
          .from(providerConfigurations)
          .where(eq(providerConfigurations.tenantId, northstarId)),
        await tx
          .select()
          .from(deliveryDestinations)
          .where(eq(deliveryDestinations.tenantId, northstarId)),
        await tx.select().from(crawlSchedules).where(eq(crawlSchedules.tenantId, northstarId)),
        await tx.select().from(secretReferences).where(eq(secretReferences.tenantId, northstarId)),
        await tx.select().from(invitations).where(eq(invitations.tenantId, northstarId)),
        await tx.select().from(auditEvents).where(eq(auditEvents.tenantId, northstarId)),
        await tx.select().from(tenantLimits).where(eq(tenantLimits.tenantId, northstarId)),
        await tx.select().from(userMemberships).where(eq(userMemberships.tenantId, northstarId)),
      ];
    });
    expect(hidden.every((rows) => rows.length === 0)).toBe(true);
  });
});

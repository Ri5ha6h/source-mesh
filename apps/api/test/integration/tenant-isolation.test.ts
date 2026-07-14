import { ContextMismatchError } from '@source-mesh/contracts';
import { createDatabase, workspaceNotes } from '@source-mesh/database';
import { eq, sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { SessionRepository } from '../../src/session/session.repository.js';

const issuer = process.env.KEYCLOAK_ISSUER_PUBLIC ?? 'http://localhost:8080/realms/source-mesh';
const repository = new SessionRepository();
const database = createDatabase();

const identity = (subject: string, email: string) => ({
  issuer,
  subject,
  email,
  displayName: subject,
});

afterAll(() => database.pool.end());

describe('tenant isolation', () => {
  it('composes roles and safely rejects a stale last context', async () => {
    const priya = await repository.load(
      identity('10000000-0000-4000-8000-000000000004', 'priya.operator@example.test'),
    );
    expect(priya.memberships).toHaveLength(2);
    expect(priya.capabilitiesByContext.platform).toContain('mapping:publish');

    const avery = await repository.load(
      identity('10000000-0000-4000-8000-000000000001', 'avery.admin@example.test'),
    );
    expect(avery.capabilitiesByContext.platform).not.toContain('mapping:publish');

    const victor = await repository.load(
      identity('10000000-0000-4000-8000-000000000005', 'victor.viewer@example.test'),
    );
    expect(victor.lastValidContext).toBeNull();
  });

  it('returns only notes allowed by membership and RLS tenant context', async () => {
    const priya = identity('10000000-0000-4000-8000-000000000004', 'priya.operator@example.test');
    await expect(repository.workspaceSummary(priya, 'acme-europe')).resolves.toMatchObject({
      tenant: { slug: 'acme-europe' },
      notes: [{ message: 'Acme synthetic workspace is isolated.' }],
    });
    await expect(repository.workspaceSummary(priya, 'northstar-logistics')).resolves.toMatchObject({
      tenant: { slug: 'northstar-logistics' },
      notes: [{ message: 'Northstar synthetic workspace is isolated.' }],
    });

    await expect(
      repository.workspaceSummary(
        identity('10000000-0000-4000-8000-000000000005', 'victor.viewer@example.test'),
        'acme-europe',
      ),
    ).rejects.toEqual(new ContextMismatchError({ resource: 'workspace' }));
  });

  it('does not reveal a row when a query tenant differs from the RLS context', async () => {
    const acmeId = '20000000-0000-4000-8000-000000000001';
    const northstarId = '20000000-0000-4000-8000-000000000002';
    const visible = await database.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${acmeId}, true)`);
      return tx.select().from(workspaceNotes).where(eq(workspaceNotes.tenantId, northstarId));
    });
    expect(visible).toEqual([]);
  });

  it('denies membership writes through the application database role', async () => {
    await expect(
      database.db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('app.current_user_id', ${'10000000-0000-4000-8000-000000000003'}, true)`,
        );
        await tx.execute(
          sql`INSERT INTO "user_memberships" ("userId", "tenantId", "role") VALUES (${'10000000-0000-4000-8000-000000000003'}, ${'20000000-0000-4000-8000-000000000001'}, 'tenant_viewer')`,
        );
      }),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
  });
});

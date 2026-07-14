import { Injectable } from '@nestjs/common';
import {
  AuthenticationError,
  computeMembershipCapabilities,
  computePlatformCapabilities,
  ContextMismatchError,
  type Capability,
  type MembershipRole,
  type PlatformRole,
  type Session,
} from '@source-mesh/contracts';
import {
  createDatabase,
  platformRoleAssignments,
  tenants,
  userMemberships,
  userPreferences,
  users,
  workspaceNotes,
} from '@source-mesh/database';
import { and, eq, sql } from 'drizzle-orm';
import type { VerifiedIdentity } from '../auth/oidc-provider.js';

@Injectable()
export class SessionRepository {
  private readonly database = createDatabase();

  async load(identity: VerifiedIdentity): Promise<Session> {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(and(eq(users.issuer, identity.issuer), eq(users.subject, identity.subject)))
      .limit(1);
    if (!user || user.status !== 'active') {
      throw new AuthenticationError({ reason: 'disabled_identity' });
    }

    return this.database.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_user_id', ${user.id}, true)`);
      const assignments = await tx
        .select()
        .from(platformRoleAssignments)
        .where(
          and(
            eq(platformRoleAssignments.userId, user.id),
            eq(platformRoleAssignments.status, 'active'),
          ),
        );
      const membershipRows = await tx
        .select({
          tenantId: userMemberships.tenantId,
          role: userMemberships.role,
          tenantSlug: tenants.slug,
          tenantName: tenants.name,
        })
        .from(userMemberships)
        .innerJoin(tenants, eq(tenants.id, userMemberships.tenantId))
        .where(
          and(
            eq(userMemberships.userId, user.id),
            eq(userMemberships.status, 'active'),
            eq(tenants.status, 'active'),
          ),
        );
      const preferences = await tx
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, user.id))
        .limit(1);

      const platformRoles = assignments.map(({ role }) => role as PlatformRole);
      const grouped = new Map<string, (typeof membershipRows)[number][]>();
      for (const row of membershipRows) {
        grouped.set(row.tenantId, [...(grouped.get(row.tenantId) ?? []), row]);
      }
      const memberships = [...grouped.values()].map((rows) => ({
        tenantId: rows[0]!.tenantId,
        tenantSlug: rows[0]!.tenantSlug,
        tenantName: rows[0]!.tenantName,
        roles: rows.map(({ role }) => role as MembershipRole),
      }));

      const capabilitiesByContext: Record<string, Capability[]> = {};
      if (platformRoles.length > 0) {
        capabilitiesByContext.platform = computePlatformCapabilities(platformRoles);
      }
      for (const membership of memberships) {
        capabilitiesByContext[`workspace:${membership.tenantId}`] = computeMembershipCapabilities(
          membership.roles,
        );
      }

      const preference = preferences[0];
      const preferredMembership = memberships.find(
        ({ tenantId }) => tenantId === preference?.tenantId,
      );
      const lastValidContext =
        preference?.contextType === 'platform' && platformRoles.length > 0
          ? ({ type: 'platform' } as const)
          : preferredMembership
            ? ({ type: 'workspace', tenantSlug: preferredMembership.tenantSlug } as const)
            : null;

      return {
        identity: { id: user.id, displayName: user.displayName, email: user.email },
        platformRoles,
        memberships,
        capabilitiesByContext,
        lastValidContext,
      };
    });
  }

  async workspaceSummary(identity: VerifiedIdentity, tenantSlug: string) {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(and(eq(users.issuer, identity.issuer), eq(users.subject, identity.subject)))
      .limit(1);
    const [tenant] = await this.database.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1);
    if (!user || user.status !== 'active' || !tenant || tenant.status !== 'active') {
      throw new ContextMismatchError({ resource: 'workspace' });
    }

    return this.database.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_user_id', ${user.id}, true)`);
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`);
      const [membership] = await tx
        .select()
        .from(userMemberships)
        .where(
          and(
            eq(userMemberships.userId, user.id),
            eq(userMemberships.tenantId, tenant.id),
            eq(userMemberships.status, 'active'),
          ),
        )
        .limit(1);
      if (!membership) throw new ContextMismatchError({ resource: 'workspace' });
      const notes = await tx
        .select()
        .from(workspaceNotes)
        .where(eq(workspaceNotes.tenantId, tenant.id));
      return { tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name }, notes };
    });
  }
}

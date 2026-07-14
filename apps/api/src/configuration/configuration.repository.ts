import { Inject, Injectable } from '@nestjs/common';
import {
  AuthorizationError,
  ConfigurationError,
  ContextMismatchError,
  type ConfigureWorkspaceRequest,
  type CreateTenantRequest,
  type InviteMemberRequest,
  type TenantLifecycleRequest,
  type WorkspaceConfiguration,
} from '@source-mesh/contracts';
import {
  auditEvents,
  crawlSchedules,
  createDatabase,
  deliveryDestinations,
  invitations,
  platformRoleAssignments,
  providerConfigurations,
  secretReferences,
  tenantDomains,
  tenantLimits,
  tenants,
  userMemberships,
  users,
} from '@source-mesh/database';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { VerifiedIdentity } from '../auth/oidc-provider.js';
import { VolumeSecretStore } from './secret-store.js';

@Injectable()
export class ConfigurationRepository {
  private readonly database = createDatabase();
  constructor(@Inject(VolumeSecretStore) private readonly secrets: VolumeSecretStore) {}

  async listTenants(identity: VerifiedIdentity) {
    const user = await this.platformAdmin(identity);
    const rows = await this.database.db.select().from(tenants).orderBy(tenants.name);
    return { actor: user.displayName, tenants: rows };
  }

  async createTenant(identity: VerifiedIdentity, input: CreateTenantRequest) {
    const user = await this.platformAdmin(identity);
    try {
      return await this.database.db.transaction(async (tx) => {
        const [tenant] = await tx
          .insert(tenants)
          .values({ name: input.name, slug: input.slug, status: 'provisioning' })
          .returning();
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenant!.id}, true)`);
        await tx.insert(tenantDomains).values({
          tenantId: tenant!.id,
          domain: 'logistics',
          mode: 'ocean',
          status: 'active',
        });
        await tx.insert(tenantLimits).values({
          tenantId: tenant!.id,
          requestsPerMinute: 10,
          concurrentCrawls: 2,
        });
        await tx.insert(auditEvents).values({
          tenantId: tenant!.id,
          actorUserId: user.id,
          action: 'tenant.created',
          resourceType: 'tenant',
          resourceId: tenant!.id,
          metadata: { synthetic: true },
        });
        return tenant!;
      });
    } catch (error) {
      if (isPgCode(error, '23505')) throw new ConfigurationError({ reason: 'duplicate_tenant' });
      throw error;
    }
  }

  async transitionTenant(
    identity: VerifiedIdentity,
    tenantSlug: string,
    input: TenantLifecycleRequest,
  ) {
    const user = await this.platformAdmin(identity);
    const [tenant] = await this.database.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug));
    if (!tenant) throw new ContextMismatchError({ resource: 'workspace' });
    const transitions: Record<string, readonly string[]> = {
      provisioning: ['active'],
      active: ['suspended'],
      suspended: ['active'],
    };
    if (!transitions[tenant.status]?.includes(input.status)) {
      throw new ConfigurationError({ reason: 'invalid_transition' });
    }
    await this.database.db.transaction(async (tx) => {
      await tx.update(tenants).set({ status: input.status }).where(eq(tenants.id, tenant.id));
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`);
      await tx.insert(auditEvents).values({
        tenantId: tenant.id,
        actorUserId: user.id,
        action: `tenant.${input.status}`,
        resourceType: 'tenant',
        resourceId: tenant.id,
        metadata: {},
      });
    });
    return { ...tenant, status: input.status };
  }

  async configuration(
    identity: VerifiedIdentity,
    tenantSlug: string,
  ): Promise<WorkspaceConfiguration> {
    const context = await this.workspace(identity, tenantSlug, false);
    const result = await this.database.db.transaction(async (tx) => {
      await setContext(tx, context.user.id, context.tenant.id);
      const domains = await tx
        .select()
        .from(tenantDomains)
        .where(eq(tenantDomains.tenantId, context.tenant.id));
      const providers = await tx
        .select()
        .from(providerConfigurations)
        .where(eq(providerConfigurations.tenantId, context.tenant.id));
      const providerIds = providers.map(({ id }) => id);
      const schedules = providerIds.length
        ? await tx
            .select()
            .from(crawlSchedules)
            .where(inArray(crawlSchedules.providerId, providerIds))
        : [];
      const secretIds = providers.flatMap(({ secretReferenceId }) =>
        secretReferenceId ? [secretReferenceId] : [],
      );
      const refs = secretIds.length
        ? await tx.select().from(secretReferences).where(inArray(secretReferences.id, secretIds))
        : [];
      const limits = await tx
        .select()
        .from(tenantLimits)
        .where(eq(tenantLimits.tenantId, context.tenant.id));
      const destinations = await tx
        .select()
        .from(deliveryDestinations)
        .where(eq(deliveryDestinations.tenantId, context.tenant.id));
      const pendingInvitations = await tx
        .select()
        .from(invitations)
        .where(eq(invitations.tenantId, context.tenant.id));
      const memberRows = await tx
        .select({ displayName: users.displayName, email: users.email, role: userMemberships.role })
        .from(userMemberships)
        .innerJoin(users, eq(users.id, userMemberships.userId))
        .where(
          and(
            eq(userMemberships.tenantId, context.tenant.id),
            eq(userMemberships.status, 'active'),
          ),
        );
      const audits = await tx
        .select({
          action: auditEvents.action,
          resourceType: auditEvents.resourceType,
          createdAt: auditEvents.createdAt,
        })
        .from(auditEvents)
        .where(eq(auditEvents.tenantId, context.tenant.id))
        .orderBy(desc(auditEvents.createdAt))
        .limit(5);
      return {
        domains,
        providers,
        schedules,
        refs,
        limits,
        destinations,
        pendingInvitations,
        memberRows,
        audits,
      };
    });

    const refsById = new Map(result.refs.map((ref) => [ref.id, ref]));
    const schedulesByProvider = new Map(
      result.schedules.map((schedule) => [schedule.providerId, schedule]),
    );
    const secretStates = new Map<string, 'configured' | 'missing'>();
    await Promise.all(
      result.refs.map(async (ref) =>
        secretStates.set(
          ref.id,
          (await this.secrets.has(ref.opaqueRef)) ? 'configured' : 'missing',
        ),
      ),
    );
    const groupedMembers = new Map<
      string,
      {
        displayName: string;
        email: string;
        roles: ('tenant_admin' | 'tenant_operator' | 'tenant_viewer')[];
      }
    >();
    for (const row of result.memberRows) {
      const member = groupedMembers.get(row.email) ?? {
        displayName: row.displayName,
        email: row.email,
        roles: [],
      };
      member.roles.push(row.role as (typeof member.roles)[number]);
      groupedMembers.set(row.email, member);
    }
    return {
      tenant: { id: context.tenant.id, slug: context.tenant.slug, name: context.tenant.name },
      domain: { domain: 'logistics', mode: 'ocean' },
      providers: result.providers.map((provider) => {
        const schedule = schedulesByProvider.get(provider.id);
        const secret = provider.secretReferenceId
          ? refsById.get(provider.secretReferenceId)
          : undefined;
        return {
          id: provider.id,
          providerCode: provider.providerCode as 'msc' | 'maersk',
          displayName: provider.displayName,
          referenceTypes: provider.referenceTypes as ('container' | 'booking')[],
          secretStatus: secret ? (secretStates.get(secret.id) ?? 'missing') : 'missing',
          cadence: schedule?.cron ?? 'not scheduled',
          timezone: schedule?.timezone ?? 'UTC',
        };
      }),
      limits: result.limits[0] ?? { requestsPerMinute: 0, concurrentCrawls: 0 },
      destinations: result.destinations.map(({ id, name, type, format }) => ({
        id,
        name,
        type: type as 'download' | 'webhook',
        format: format as 'json' | 'xml',
      })),
      invitations: result.pendingInvitations.map(({ email, role, status }) => ({
        email,
        role: role as 'tenant_admin' | 'tenant_operator' | 'tenant_viewer',
        status,
      })),
      members: [...groupedMembers.values()],
      recentAudit: result.audits.map((event) => ({
        action: event.action,
        resourceType: event.resourceType,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  async configure(
    identity: VerifiedIdentity,
    tenantSlug: string,
    input: ConfigureWorkspaceRequest,
  ) {
    const context = await this.workspace(identity, tenantSlug, true);
    if (input.providerCode === 'maersk' && input.referenceTypes.includes('booking')) {
      throw new ConfigurationError({ reason: 'invalid_configuration' });
    }
    const opaqueRef = await this.secrets.put(tenantSlug, input.providerCode, input.credential);
    return this.database.db.transaction(async (tx) => {
      await setContext(tx, context.user.id, context.tenant.id);
      const [secret] = await tx
        .insert(secretReferences)
        .values({
          tenantId: context.tenant.id,
          name: `${input.providerCode}-dummy-credentials`,
          opaqueRef,
        })
        .onConflictDoUpdate({
          target: [secretReferences.tenantId, secretReferences.name],
          set: { opaqueRef, status: 'configured', updatedAt: new Date() },
        })
        .returning();
      const [provider] = await tx
        .insert(providerConfigurations)
        .values({
          tenantId: context.tenant.id,
          providerCode: input.providerCode,
          displayName: input.displayName,
          referenceTypes: [...input.referenceTypes],
          secretReferenceId: secret!.id,
        })
        .onConflictDoUpdate({
          target: [providerConfigurations.tenantId, providerConfigurations.providerCode],
          set: {
            displayName: input.displayName,
            referenceTypes: [...input.referenceTypes],
            secretReferenceId: secret!.id,
            enabled: true,
          },
        })
        .returning();
      await tx
        .insert(crawlSchedules)
        .values({
          tenantId: context.tenant.id,
          providerId: provider!.id,
          cron: input.cadence,
          timezone: input.timezone,
        })
        .onConflictDoUpdate({
          target: [crawlSchedules.tenantId, crawlSchedules.providerId],
          set: { cron: input.cadence, timezone: input.timezone, enabled: true },
        });
      await tx
        .insert(tenantLimits)
        .values({
          tenantId: context.tenant.id,
          requestsPerMinute: input.requestsPerMinute,
          concurrentCrawls: input.concurrentCrawls,
        })
        .onConflictDoUpdate({
          target: tenantLimits.tenantId,
          set: {
            requestsPerMinute: input.requestsPerMinute,
            concurrentCrawls: input.concurrentCrawls,
          },
        });
      const destinationName = `${context.tenant.name} ${input.destinationType}`;
      await tx
        .insert(deliveryDestinations)
        .values({
          tenantId: context.tenant.id,
          name: destinationName,
          type: input.destinationType,
          endpoint:
            input.destinationType === 'webhook'
              ? `http://dummy-boundary:8100/webhooks/${tenantSlug}`
              : null,
          format: input.destinationFormat,
        })
        .onConflictDoUpdate({
          target: [deliveryDestinations.tenantId, deliveryDestinations.name],
          set: { format: input.destinationFormat, enabled: true },
        });
      await tx.insert(auditEvents).values({
        tenantId: context.tenant.id,
        actorUserId: context.user.id,
        action: 'workspace.configuration.updated',
        resourceType: 'provider',
        resourceId: provider!.id,
        metadata: { providerCode: input.providerCode, credential: '[REDACTED]' },
      });
      return { providerId: provider!.id, secretStatus: 'configured' as const };
    });
  }

  async invite(identity: VerifiedIdentity, tenantSlug: string, input: InviteMemberRequest) {
    const context = await this.workspace(identity, tenantSlug, true, 'member:manage');
    try {
      const [invitation] = await this.database.db.transaction(async (tx) => {
        await setContext(tx, context.user.id, context.tenant.id);
        const inserted = await tx
          .insert(invitations)
          .values({
            tenantId: context.tenant.id,
            email: input.email,
            role: input.role,
            invitedBy: context.user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
          .returning();
        await tx.insert(auditEvents).values({
          tenantId: context.tenant.id,
          actorUserId: context.user.id,
          action: 'member.invited',
          resourceType: 'invitation',
          resourceId: inserted[0]!.id,
          metadata: { role: input.role },
        });
        return inserted;
      });
      return {
        id: invitation!.id,
        email: invitation!.email,
        role: invitation!.role,
        status: invitation!.status,
      };
    } catch (error) {
      if (isPgCode(error, '23505'))
        throw new ConfigurationError({ reason: 'duplicate_invitation' });
      throw error;
    }
  }

  private async platformAdmin(identity: VerifiedIdentity) {
    const user = await this.user(identity);
    const [assignment] = await this.database.db
      .select()
      .from(platformRoleAssignments)
      .where(
        and(
          eq(platformRoleAssignments.userId, user.id),
          eq(platformRoleAssignments.role, 'platform_admin'),
          eq(platformRoleAssignments.status, 'active'),
        ),
      );
    if (!assignment) throw new AuthorizationError({ capability: 'tenant:manage' });
    return user;
  }

  private async workspace(
    identity: VerifiedIdentity,
    tenantSlug: string,
    requireAdmin: boolean,
    capability: 'workspace:configure' | 'member:manage' = 'workspace:configure',
  ) {
    const user = await this.user(identity);
    const [tenant] = await this.database.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, tenantSlug), eq(tenants.status, 'active')));
    if (!tenant) throw new ContextMismatchError({ resource: 'workspace' });
    const memberships = await this.database.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_user_id', ${user.id}, true)`);
      return tx
        .select()
        .from(userMemberships)
        .where(
          and(
            eq(userMemberships.userId, user.id),
            eq(userMemberships.tenantId, tenant.id),
            eq(userMemberships.status, 'active'),
          ),
        );
    });
    if (memberships.length === 0) throw new ContextMismatchError({ resource: 'workspace' });
    if (requireAdmin && !memberships.some(({ role }) => role === 'tenant_admin')) {
      throw new AuthorizationError({ capability });
    }
    return { user, tenant };
  }

  private async user(identity: VerifiedIdentity) {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.issuer, identity.issuer),
          eq(users.subject, identity.subject),
          eq(users.status, 'active'),
        ),
      );
    if (!user) throw new ContextMismatchError({ resource: 'workspace' });
    return user;
  }
}

async function setContext(
  tx: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
  userId: string,
  tenantId: string,
) {
  await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
  await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
}

function isPgCode(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'cause' in error &&
    typeof error.cause === 'object' &&
    error.cause !== null &&
    'code' in error.cause &&
    error.cause.code === code
  );
}

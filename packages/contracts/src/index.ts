import { Data, Schema } from 'effect';

export const PlatformRole = Schema.Literal('platform_admin', 'platform_approver');
export type PlatformRole = typeof PlatformRole.Type;

export const MembershipRole = Schema.Literal('tenant_admin', 'tenant_operator', 'tenant_viewer');
export type MembershipRole = typeof MembershipRole.Type;

export const Capability = Schema.Literal(
  'tenant:manage',
  'catalog:manage',
  'audit:read',
  'mapping:review',
  'mapping:publish',
  'workspace:read',
  'workspace:configure',
  'mapping:draft',
  'member:manage',
  'reference:create',
  'crawl:execute',
  'crawl:retry',
  'delivery:retry',
  'evidence:read',
);
export type Capability = typeof Capability.Type;

export const Context = Schema.Union(
  Schema.Struct({ type: Schema.Literal('platform') }),
  Schema.Struct({ type: Schema.Literal('workspace'), tenantSlug: Schema.String }),
);
export type Context = typeof Context.Type;

export const Membership = Schema.Struct({
  tenantId: Schema.String,
  tenantSlug: Schema.String,
  tenantName: Schema.String,
  roles: Schema.Array(MembershipRole),
});
export type Membership = typeof Membership.Type;

export const Session = Schema.Struct({
  identity: Schema.Struct({
    id: Schema.String,
    displayName: Schema.String,
    email: Schema.String,
  }),
  platformRoles: Schema.Array(PlatformRole),
  memberships: Schema.Array(Membership),
  capabilitiesByContext: Schema.Record({ key: Schema.String, value: Schema.Array(Capability) }),
  lastValidContext: Schema.NullOr(Context),
});
export type Session = typeof Session.Type;

export class AuthenticationError extends Data.TaggedError('AuthenticationError')<{
  readonly reason:
    | 'invalid_token'
    | 'expired_token'
    | 'disabled_identity'
    | 'identity_provider_unavailable';
}> {}

export class AuthorizationError extends Data.TaggedError('AuthorizationError')<{
  readonly capability: Capability;
}> {}

export class ContextMismatchError extends Data.TaggedError('ContextMismatchError')<{
  readonly resource: 'workspace';
}> {}

const platformCapabilityMap: Record<PlatformRole, readonly Capability[]> = {
  platform_admin: ['tenant:manage', 'catalog:manage', 'audit:read'],
  platform_approver: ['mapping:review', 'mapping:publish'],
};

const membershipCapabilityMap: Record<MembershipRole, readonly Capability[]> = {
  tenant_admin: [
    'workspace:read',
    'workspace:configure',
    'mapping:draft',
    'member:manage',
    'reference:create',
    'crawl:execute',
    'crawl:retry',
    'delivery:retry',
    'evidence:read',
  ],
  tenant_operator: [
    'workspace:read',
    'reference:create',
    'crawl:execute',
    'crawl:retry',
    'delivery:retry',
    'evidence:read',
  ],
  tenant_viewer: ['workspace:read', 'evidence:read'],
};

const unique = (capabilities: readonly Capability[]) => [...new Set(capabilities)].toSorted();

export function computePlatformCapabilities(roles: readonly PlatformRole[]): Capability[] {
  return unique(roles.flatMap((role) => platformCapabilityMap[role]));
}

export function computeMembershipCapabilities(roles: readonly MembershipRole[]): Capability[] {
  return unique(roles.flatMap((role) => membershipCapabilityMap[role]));
}

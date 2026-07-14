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

export const TenantStatus = Schema.Literal('provisioning', 'active', 'suspended');
export type TenantStatus = typeof TenantStatus.Type;
export const ProviderCode = Schema.Literal('msc', 'maersk');
export type ProviderCode = typeof ProviderCode.Type;
export const ReferenceType = Schema.Literal('container', 'booking');
export type ReferenceType = typeof ReferenceType.Type;
export const MembershipInvitationRole = MembershipRole;

const RequiredText = Schema.String.pipe(Schema.minLength(1), Schema.maxLength(120));
const Slug = Schema.String.pipe(Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));
const SyntheticEmail = Schema.String.pipe(Schema.pattern(/^[^\s@]+@example\.test$/));

export const CreateTenantRequest = Schema.Struct({ name: RequiredText, slug: Slug });
export type CreateTenantRequest = typeof CreateTenantRequest.Type;

export const TenantLifecycleRequest = Schema.Struct({ status: TenantStatus });
export type TenantLifecycleRequest = typeof TenantLifecycleRequest.Type;

export const InviteMemberRequest = Schema.Struct({
  email: SyntheticEmail,
  role: MembershipInvitationRole,
});
export type InviteMemberRequest = typeof InviteMemberRequest.Type;

export const ConfigureWorkspaceRequest = Schema.Struct({
  providerCode: ProviderCode,
  displayName: RequiredText,
  referenceTypes: Schema.Array(ReferenceType).pipe(Schema.minItems(1)),
  credential: RequiredText,
  cadence: Schema.Literal('*/5 * * * *', '*/15 * * * *', '*/30 * * * *', '0 * * * *'),
  timezone: Schema.Literal('UTC', 'Europe/Copenhagen'),
  requestsPerMinute: Schema.Number.pipe(Schema.int(), Schema.between(1, 60)),
  concurrentCrawls: Schema.Number.pipe(Schema.int(), Schema.between(1, 10)),
  destinationType: Schema.Literal('download', 'webhook'),
  destinationFormat: Schema.Literal('json', 'xml'),
});
export type ConfigureWorkspaceRequest = typeof ConfigureWorkspaceRequest.Type;

export const WorkspaceConfiguration = Schema.Struct({
  tenant: Schema.Struct({ id: Schema.String, slug: Schema.String, name: Schema.String }),
  domain: Schema.Struct({ domain: Schema.Literal('logistics'), mode: Schema.Literal('ocean') }),
  providers: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      providerCode: ProviderCode,
      displayName: Schema.String,
      referenceTypes: Schema.Array(ReferenceType),
      secretStatus: Schema.Literal('configured', 'missing'),
      cadence: Schema.String,
      timezone: Schema.String,
    }),
  ),
  limits: Schema.Struct({ requestsPerMinute: Schema.Number, concurrentCrawls: Schema.Number }),
  destinations: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      type: Schema.Literal('download', 'webhook'),
      format: Schema.Literal('json', 'xml'),
    }),
  ),
  invitations: Schema.Array(
    Schema.Struct({ email: Schema.String, role: MembershipRole, status: Schema.String }),
  ),
  members: Schema.Array(
    Schema.Struct({
      displayName: Schema.String,
      email: Schema.String,
      roles: Schema.Array(MembershipRole),
    }),
  ),
  recentAudit: Schema.Array(
    Schema.Struct({ action: Schema.String, resourceType: Schema.String, createdAt: Schema.String }),
  ),
});
export type WorkspaceConfiguration = typeof WorkspaceConfiguration.Type;

export class ConfigurationError extends Data.TaggedError('ConfigurationError')<{
  readonly reason:
    | 'duplicate_tenant'
    | 'duplicate_invitation'
    | 'invalid_transition'
    | 'invalid_configuration'
    | 'missing_dummy_secret';
}> {}

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

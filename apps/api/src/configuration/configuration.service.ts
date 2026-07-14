import { Inject, Injectable } from '@nestjs/common';
import type {
  ConfigureWorkspaceRequest,
  CreateTenantRequest,
  InviteMemberRequest,
  TenantLifecycleRequest,
} from '@source-mesh/contracts';
import { Effect } from 'effect';
import type { VerifiedIdentity } from '../auth/oidc-provider.js';
import { ConfigurationRepository } from './configuration.repository.js';

@Injectable()
export class ConfigurationService {
  constructor(
    @Inject(ConfigurationRepository) private readonly repository: ConfigurationRepository,
  ) {}
  listTenants(identity: VerifiedIdentity) {
    return attempt(() => this.repository.listTenants(identity), 'tenant.list');
  }
  createTenant(identity: VerifiedIdentity, input: CreateTenantRequest) {
    return attempt(() => this.repository.createTenant(identity, input), 'tenant.create');
  }
  transitionTenant(identity: VerifiedIdentity, slug: string, input: TenantLifecycleRequest) {
    return attempt(
      () => this.repository.transitionTenant(identity, slug, input),
      'tenant.transition',
    );
  }
  configuration(identity: VerifiedIdentity, slug: string) {
    return attempt(() => this.repository.configuration(identity, slug), 'configuration.read');
  }
  configure(identity: VerifiedIdentity, slug: string, input: ConfigureWorkspaceRequest) {
    return attempt(() => this.repository.configure(identity, slug, input), 'configuration.write');
  }
  invite(identity: VerifiedIdentity, slug: string, input: InviteMemberRequest) {
    return attempt(() => this.repository.invite(identity, slug, input), 'member.invite');
  }
}

function attempt<A>(run: () => Promise<A>, span: string) {
  return Effect.tryPromise({ try: run, catch: (error) => error as Error }).pipe(
    Effect.withSpan(span),
  );
}

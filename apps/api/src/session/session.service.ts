import { Inject, Injectable } from '@nestjs/common';
import { Effect } from 'effect';
import type { VerifiedIdentity } from '../auth/oidc-provider.js';
import { SessionRepository } from './session.repository.js';

@Injectable()
export class SessionService {
  constructor(@Inject(SessionRepository) private readonly repository: SessionRepository) {}

  load(identity: VerifiedIdentity) {
    return Effect.tryPromise({
      try: () => this.repository.load(identity),
      catch: (error) => error as Error,
    }).pipe(Effect.withSpan('session.load'));
  }

  workspaceSummary(identity: VerifiedIdentity, tenantSlug: string) {
    return Effect.tryPromise({
      try: () => this.repository.workspaceSummary(identity, tenantSlug),
      catch: (error) => error as Error,
    }).pipe(Effect.withSpan('workspace.summary'));
  }
}

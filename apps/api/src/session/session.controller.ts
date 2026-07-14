import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import { Effect, Either } from 'effect';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { SessionService } from './session.service.js';

@Controller('v1')
@UseGuards(AuthGuard)
export class SessionController {
  constructor(@Inject(SessionService) private readonly sessions: SessionService) {}

  @Get('session')
  getSession(@Req() request: AuthenticatedRequest) {
    return runApplication(this.sessions.load(request.identity));
  }

  @Get('workspaces/:tenantSlug/summary')
  getWorkspace(@Req() request: AuthenticatedRequest, @Param('tenantSlug') tenantSlug: string) {
    return runApplication(this.sessions.workspaceSummary(request.identity, tenantSlug));
  }
}

async function runApplication<A, E extends Error>(application: Effect.Effect<A, E>): Promise<A> {
  const result = await Effect.runPromise(Effect.either(application));
  if (Either.isLeft(result)) throw result.left;
  return result.right;
}

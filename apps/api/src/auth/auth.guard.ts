import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthenticationError } from '@source-mesh/contracts';
import type { FastifyRequest } from 'fastify';
import { OIDC_PROVIDER, type OidcProvider, type VerifiedIdentity } from './oidc-provider.js';

export type AuthenticatedRequest = FastifyRequest & { identity: VerifiedIdentity };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(OIDC_PROVIDER) private readonly oidc: OidcProvider) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new AuthenticationError({ reason: 'invalid_token' });
    }
    request.identity = await this.oidc.verify(authorization.slice('Bearer '.length));
    return true;
  }
}

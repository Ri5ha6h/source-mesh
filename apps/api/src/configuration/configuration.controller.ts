import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ConfigurationError,
  ConfigureWorkspaceRequest,
  CreateTenantRequest,
  InviteMemberRequest,
  TenantLifecycleRequest,
} from '@source-mesh/contracts';
import { Effect, Either, Schema } from 'effect';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { ConfigurationService } from './configuration.service.js';

@Controller('v1')
@UseGuards(AuthGuard)
export class ConfigurationController {
  constructor(@Inject(ConfigurationService) private readonly configuration: ConfigurationService) {}

  @Get('platform/tenants')
  listTenants(@Req() request: AuthenticatedRequest) {
    return run(this.configuration.listTenants(request.identity));
  }

  @Post('platform/tenants')
  createTenant(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return run(
      this.configuration.createTenant(request.identity, decode(CreateTenantRequest, body)),
    );
  }

  @Patch('platform/tenants/:tenantSlug/status')
  transitionTenant(
    @Req() request: AuthenticatedRequest,
    @Param('tenantSlug') slug: string,
    @Body() body: unknown,
  ) {
    return run(
      this.configuration.transitionTenant(
        request.identity,
        slug,
        decode(TenantLifecycleRequest, body),
      ),
    );
  }

  @Get('workspaces/:tenantSlug/configuration')
  getConfiguration(@Req() request: AuthenticatedRequest, @Param('tenantSlug') slug: string) {
    return run(this.configuration.configuration(request.identity, slug));
  }

  @Post('workspaces/:tenantSlug/configuration')
  configure(
    @Req() request: AuthenticatedRequest,
    @Param('tenantSlug') slug: string,
    @Body() body: unknown,
  ) {
    return run(
      this.configuration.configure(request.identity, slug, decode(ConfigureWorkspaceRequest, body)),
    );
  }

  @Post('workspaces/:tenantSlug/invitations')
  invite(
    @Req() request: AuthenticatedRequest,
    @Param('tenantSlug') slug: string,
    @Body() body: unknown,
  ) {
    return run(
      this.configuration.invite(request.identity, slug, decode(InviteMemberRequest, body)),
    );
  }
}

function decode<A, I>(schema: Schema.Schema<A, I>, body: unknown): A {
  try {
    return Schema.decodeUnknownSync(schema)(body);
  } catch {
    throw new ConfigurationError({ reason: 'invalid_configuration' });
  }
}

async function run<A, E extends Error>(application: Effect.Effect<A, E>): Promise<A> {
  const result = await Effect.runPromise(Effect.either(application));
  if (Either.isLeft(result)) throw result.left;
  return result.right;
}

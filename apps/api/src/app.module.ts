import { Module } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard.js';
import { KeycloakOidcProvider, OIDC_PROVIDER } from './auth/oidc-provider.js';
import { HealthController } from './health.controller.js';
import { SessionController } from './session/session.controller.js';
import { SessionRepository } from './session/session.repository.js';
import { SessionService } from './session/session.service.js';

@Module({
  controllers: [HealthController, SessionController],
  providers: [
    AuthGuard,
    SessionRepository,
    SessionService,
    KeycloakOidcProvider,
    { provide: OIDC_PROVIDER, useExisting: KeycloakOidcProvider },
  ],
})
export class AppModule {}

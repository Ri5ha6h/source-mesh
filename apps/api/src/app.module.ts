import { Module } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard.js';
import { KeycloakOidcProvider, OIDC_PROVIDER } from './auth/oidc-provider.js';
import { HealthController } from './health.controller.js';
import { ConfigurationController } from './configuration/configuration.controller.js';
import { ConfigurationRepository } from './configuration/configuration.repository.js';
import { ConfigurationService } from './configuration/configuration.service.js';
import { VolumeSecretStore } from './configuration/secret-store.js';
import { SessionController } from './session/session.controller.js';
import { SessionRepository } from './session/session.repository.js';
import { SessionService } from './session/session.service.js';

@Module({
  controllers: [HealthController, SessionController, ConfigurationController],
  providers: [
    AuthGuard,
    SessionRepository,
    SessionService,
    ConfigurationRepository,
    ConfigurationService,
    VolumeSecretStore,
    KeycloakOidcProvider,
    { provide: OIDC_PROVIDER, useExisting: KeycloakOidcProvider },
  ],
})
export class AppModule {}

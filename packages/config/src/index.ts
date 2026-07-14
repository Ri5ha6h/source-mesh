import { Config, Effect, Redacted } from 'effect';

export const AppConfig = Effect.all({
  databaseUrl: Config.redacted('DATABASE_URL'),
  oidcIssuer: Config.string('KEYCLOAK_ISSUER_INTERNAL'),
  oidcPublicIssuer: Config.string('KEYCLOAK_ISSUER_PUBLIC'),
  oidcClientId: Config.string('OIDC_CLIENT_ID'),
  oidcClientSecret: Config.redacted('OIDC_CLIENT_SECRET'),
});

export const revealForAdapter = Redacted.value;

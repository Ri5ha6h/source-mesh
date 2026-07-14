import { Context, type Effect } from 'effect';

export interface OidcIdentity {
  readonly issuer: string;
  readonly subject: string;
  readonly email: string;
  readonly displayName: string;
}

export interface OidcProviderService {
  readonly verify: (token: string) => Effect.Effect<OidcIdentity, Error>;
}

export class OidcProvider extends Context.Tag('OidcProvider')<
  OidcProvider,
  OidcProviderService
>() {}

export interface SecretStoreService {
  readonly read: (reference: string) => Effect.Effect<string, Error>;
}

export class SecretStore extends Context.Tag('SecretStore')<SecretStore, SecretStoreService>() {}

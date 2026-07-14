import { Injectable } from '@nestjs/common';
import { AuthenticationError } from '@source-mesh/contracts';
import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type CryptoKey,
  type JWK,
  type JWTVerifyGetKey,
  type KeyObject,
} from 'jose';

export interface VerifiedIdentity {
  readonly issuer: string;
  readonly subject: string;
  readonly email: string;
  readonly displayName: string;
}

export const OIDC_PROVIDER = Symbol('OIDC_PROVIDER');

export interface OidcProvider {
  verify(token: string): Promise<VerifiedIdentity>;
}

@Injectable()
export class KeycloakOidcProvider implements OidcProvider {
  private readonly issuer = requireEnvironment('KEYCLOAK_ISSUER_PUBLIC');
  private readonly audience = requireEnvironment('OIDC_CLIENT_ID');
  private readonly jwks = createRemoteJWKSet(
    new URL(`${requireEnvironment('KEYCLOAK_ISSUER_INTERNAL')}/protocol/openid-connect/certs`),
  );

  async verify(token: string): Promise<VerifiedIdentity> {
    return verifyOidcToken(token, this.jwks, this.issuer, this.audience);
  }
}

export function verifyOidcToken(
  token: string,
  key: JWTVerifyGetKey,
  issuer: string,
  audience: string,
): Promise<VerifiedIdentity>;
export function verifyOidcToken(
  token: string,
  key: CryptoKey | KeyObject | JWK | Uint8Array,
  issuer: string,
  audience: string,
): Promise<VerifiedIdentity>;
export async function verifyOidcToken(
  token: string,
  key: CryptoKey | KeyObject | JWK | Uint8Array | JWTVerifyGetKey,
  issuer: string,
  audience: string,
): Promise<VerifiedIdentity> {
  try {
    const options = { issuer, audience, requiredClaims: ['sub', 'email'] };
    const { payload } =
      typeof key === 'function'
        ? await jwtVerify(token, key, options)
        : await jwtVerify(token, key, options);
    return {
      issuer: payload.iss as string,
      subject: payload.sub as string,
      email: payload.email as string,
      displayName: (payload.name as string | undefined) ?? (payload.email as string),
    };
  } catch (error) {
    const reason =
      error instanceof errors.JWKSTimeout ||
      error instanceof errors.JWKSInvalid ||
      error instanceof TypeError
        ? 'identity_provider_unavailable'
        : error instanceof errors.JWTExpired
          ? 'expired_token'
          : 'invalid_token';
    throw new AuthenticationError({ reason });
  }
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

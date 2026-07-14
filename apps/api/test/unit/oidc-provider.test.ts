import { AuthenticationError } from '@source-mesh/contracts';
import { generateKeyPair, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { verifyOidcToken } from '../../src/auth/oidc-provider.js';

const issuer = 'http://localhost:8080/realms/source-mesh';
const audience = 'source-mesh-web';

const unavailableKey = async () => {
  throw new TypeError('fetch failed');
};

async function token(overrides: { issuer?: string; audience?: string; expiration?: string } = {}) {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const signed = await new SignJWT({ email: 'synthetic@example.test', name: 'Synthetic User' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(overrides.issuer ?? issuer)
    .setAudience(overrides.audience ?? audience)
    .setSubject('synthetic-subject')
    .setIssuedAt()
    .setExpirationTime(overrides.expiration ?? '5m')
    .sign(privateKey);
  return { signed, publicKey };
}

describe('OIDC verification', () => {
  it('accepts required identity claims from the configured issuer and audience', async () => {
    const { signed, publicKey } = await token();
    await expect(verifyOidcToken(signed, publicKey, issuer, audience)).resolves.toMatchObject({
      subject: 'synthetic-subject',
      email: 'synthetic@example.test',
    });
  });

  it.each([
    ['wrong issuer', { issuer: 'https://untrusted.example.test' }, 'invalid_token'],
    ['wrong audience', { audience: 'another-client' }, 'invalid_token'],
    ['expired token', { expiration: '0s' }, 'expired_token'],
  ] as const)('rejects %s', async (_name, overrides, reason) => {
    const { signed, publicKey } = await token(overrides);
    await expect(verifyOidcToken(signed, publicKey, issuer, audience)).rejects.toEqual(
      new AuthenticationError({ reason }),
    );
  });

  it('maps remote JWKS failures to an upstream identity-provider error', async () => {
    const { signed } = await token();
    await expect(verifyOidcToken(signed, unavailableKey, issuer, audience)).rejects.toEqual(
      new AuthenticationError({ reason: 'identity_provider_unavailable' }),
    );
  });
});

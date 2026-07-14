import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { EncryptJWT, jwtDecrypt } from 'jose';

const sessionCookie = 'source_mesh_session';
const stateCookie = 'source_mesh_oidc_state';
const verifierCookie = 'source_mesh_oidc_verifier';

interface TokenSession {
  readonly accessToken: string;
  readonly idToken: string;
  readonly expiresAt: number;
}

function sessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  return createHash('sha256').update(secret).digest();
}

export async function createAuthorizationUrl() {
  const origin = applicationOrigin();
  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const store = await cookies();
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: origin.startsWith('https://'),
    path: '/',
    maxAge: 600,
  };
  store.set(stateCookie, state, options);
  store.set(verifierCookie, verifier, options);

  const issuer = requireEnvironment('KEYCLOAK_ISSUER_PUBLIC');
  const url = new URL(`${issuer}/protocol/openid-connect/auth`);
  url.searchParams.set('client_id', requireEnvironment('OIDC_CLIENT_ID'));
  url.searchParams.set('redirect_uri', `${origin}/auth/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'login');
  return url;
}

export async function exchangeAuthorizationCode(code: string, state: string) {
  const origin = applicationOrigin();
  const store = await cookies();
  const expectedState = store.get(stateCookie)?.value;
  const verifier = store.get(verifierCookie)?.value;
  if (!expectedState || !verifier || state !== expectedState)
    throw new Error('Invalid authentication state');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const response = await fetch(
    `${requireEnvironment('KEYCLOAK_ISSUER_INTERNAL')}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: requireEnvironment('OIDC_CLIENT_ID'),
        client_secret: requireEnvironment('OIDC_CLIENT_SECRET'),
        redirect_uri: `${origin}/auth/callback`,
        code,
        code_verifier: verifier,
      }),
      cache: 'no-store',
      signal: controller.signal,
    },
  ).finally(() => clearTimeout(timeout));
  if (!response.ok) throw new Error('OIDC token exchange failed');
  const tokens = (await response.json()) as {
    access_token: string;
    id_token: string;
    expires_in: number;
  };
  const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
  const encrypted = await new EncryptJWT({
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    expiresAt,
  })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .encrypt(sessionKey());

  store.set(sessionCookie, encrypted, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    path: '/',
    expires: new Date(expiresAt * 1000),
  });
  store.delete(stateCookie);
  store.delete(verifierCookie);
}

export async function getTokenSession(): Promise<TokenSession | null> {
  const encrypted = (await cookies()).get(sessionCookie)?.value;
  if (!encrypted) return null;
  try {
    const { payload } = await jwtDecrypt(encrypted, sessionKey());
    if (
      typeof payload.accessToken !== 'string' ||
      typeof payload.idToken !== 'string' ||
      typeof payload.expiresAt !== 'number'
    )
      return null;
    if (payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return {
      accessToken: payload.accessToken,
      idToken: payload.idToken,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(sessionCookie);
}

export async function createLogoutUrl() {
  const origin = applicationOrigin();
  const session = await getTokenSession();
  const url = new URL(
    `${requireEnvironment('KEYCLOAK_ISSUER_PUBLIC')}/protocol/openid-connect/logout`,
  );
  url.searchParams.set('client_id', requireEnvironment('OIDC_CLIENT_ID'));
  url.searchParams.set('post_logout_redirect_uri', `${origin}/login`);
  if (session?.idToken) url.searchParams.set('id_token_hint', session.idToken);
  return url;
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function applicationOrigin(): string {
  return new URL(requireEnvironment('APP_PUBLIC_URL')).origin;
}

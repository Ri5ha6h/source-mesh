import { Schema } from 'effect';
import { redirect } from 'next/navigation';
import { Session, type Session as SessionType } from '@source-mesh/contracts';
import { getTokenSession } from './auth';

export async function getSession(): Promise<SessionType> {
  const token = await getTokenSession();
  if (!token) redirect('/login?reason=expired');
  const response = await fetchWithTimeout(`${requireEnvironment('API_INTERNAL_URL')}/v1/session`, {
    headers: { authorization: `Bearer ${token.accessToken}` },
    cache: 'no-store',
  });
  if (response.status === 401) redirect('/login?reason=expired');
  if (!response.ok) throw new Error('Unable to load the authenticated session');
  return Schema.decodeUnknownSync(Session)(await response.json());
}

export async function getWorkspaceSummary(tenantSlug: string) {
  const token = await getTokenSession();
  if (!token) redirect('/login?reason=expired');
  const response = await fetchWithTimeout(
    `${requireEnvironment('API_INTERNAL_URL')}/v1/workspaces/${encodeURIComponent(tenantSlug)}/summary`,
    { headers: { authorization: `Bearer ${token.accessToken}` }, cache: 'no-store' },
  );
  if (response.status === 401) redirect('/login?reason=expired');
  if (response.status === 404) redirect('/app?reason=workspace-unavailable');
  if (!response.ok) throw new Error('Unable to load workspace context');
  return response.json() as Promise<{
    tenant: { id: string; slug: string; name: string };
    notes: { id: string; message: string }[];
  }>;
}

async function fetchWithTimeout(input: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

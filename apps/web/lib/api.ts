import { Schema } from 'effect';
import { redirect } from 'next/navigation';
import {
  Session,
  WorkspaceConfiguration,
  type ConfigureWorkspaceRequest,
  type CreateTenantRequest,
  type InviteMemberRequest,
  type Session as SessionType,
  type WorkspaceConfiguration as WorkspaceConfigurationType,
} from '@source-mesh/contracts';
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

export async function getTenantDirectory() {
  return apiJson<{
    actor: string;
    tenants: { id: string; slug: string; name: string; status: string }[];
  }>('/v1/platform/tenants');
}

export async function createTenant(input: CreateTenantRequest) {
  return apiJson('/v1/platform/tenants', { method: 'POST', body: JSON.stringify(input) });
}

export async function transitionTenant(tenantSlug: string, status: 'active' | 'suspended') {
  return apiJson(`/v1/platform/tenants/${encodeURIComponent(tenantSlug)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getWorkspaceConfiguration(
  tenantSlug: string,
): Promise<WorkspaceConfigurationType> {
  const value = await apiJson(`/v1/workspaces/${encodeURIComponent(tenantSlug)}/configuration`);
  return Schema.decodeUnknownSync(WorkspaceConfiguration)(value);
}

export async function configureWorkspace(tenantSlug: string, input: ConfigureWorkspaceRequest) {
  return apiJson(`/v1/workspaces/${encodeURIComponent(tenantSlug)}/configuration`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function inviteMember(tenantSlug: string, input: InviteMemberRequest) {
  return apiJson(`/v1/workspaces/${encodeURIComponent(tenantSlug)}/invitations`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function apiJson<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getTokenSession();
  if (!token) redirect('/login?reason=expired');
  const response = await fetchWithTimeout(`${requireEnvironment('API_INTERNAL_URL')}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token.accessToken}`,
      'content-type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  });
  if (response.status === 401) redirect('/login?reason=expired');
  if (response.status === 404) redirect('/app?reason=workspace-unavailable');
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Source Mesh API request failed');
  }
  return response.json() as Promise<T>;
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

import { getSession, getWorkspaceConfiguration } from '../../../../lib/api';

export async function getWorkspacePageContext(tenantSlug: string) {
  const [session, configuration] = await Promise.all([
    getSession(),
    getWorkspaceConfiguration(tenantSlug),
  ]);
  const membership = session.memberships.find(
    ({ tenantId }) => tenantId === configuration.tenant.id,
  );
  if (!membership) throw new Error('workspace_context_unavailable');
  const capabilities = session.capabilitiesByContext[`workspace:${configuration.tenant.id}`] ?? [];
  return { session, configuration, membership, capabilities };
}

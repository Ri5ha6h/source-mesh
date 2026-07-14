import { getSession, getWorkspaceSummary } from '../../../../lib/api';
import { Button } from '@source-mesh/ui';

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const [session, summary] = await Promise.all([getSession(), getWorkspaceSummary(tenantSlug)]);
  const membership = session.memberships.find(({ tenantId }) => tenantId === summary.tenant.id)!;
  const capabilities = session.capabilitiesByContext[`workspace:${summary.tenant.id}`] ?? [];
  return (
    <section className="workspace-page">
      <p className="eyebrow">Workspace context</p>
      <h1>{summary.tenant.name}</h1>
      <p className="lede">
        Logistics · Ocean is the default domain. Data, actions, and evidence stay inside this
        workspace boundary.
      </p>
      <div className="metric-grid">
        <article>
          <small>MEMBERSHIP</small>
          <strong>{membership.roles.map((role) => role.replace('tenant_', '')).join(' + ')}</strong>
          <span>Computed by the API</span>
        </article>
        <article>
          <small>AVAILABLE ACTIONS</small>
          <strong>{capabilities.length}</strong>
          <span>Capability-backed controls</span>
        </article>
        <article>
          <small>ISOLATION CHECK</small>
          <strong>Enforced</strong>
          <span>Repository scope + PostgreSQL RLS</span>
        </article>
      </div>
      <div className="lineage-mini">
        <span className="complete">Submitted</span>
        <span>Captured</span>
        <span>Normalized</span>
        <span>Mapped</span>
        <span>Delivered</span>
      </div>
      <div className="empty-state">
        <span>FOUNDATION READY</span>
        <h2>No references yet</h2>
        <p>{summary.notes[0]?.message ?? 'This workspace has no visible tenant-owned records.'}</p>
        <Button variant="outline" disabled={!capabilities.includes('reference:create')}>
          Add references in Phase 3
        </Button>
      </div>
    </section>
  );
}

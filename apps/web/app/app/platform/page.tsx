import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/api';

export default async function PlatformPage() {
  const session = await getSession();
  if (session.platformRoles.length === 0) redirect('/app');
  const capabilities = session.capabilitiesByContext.platform ?? [];
  return (
    <section className="workspace-page">
      <p className="eyebrow">Platform context</p>
      <h1>Platform operations</h1>
      <p className="lede">
        Tenant lifecycle, catalog, audit, and approvals remain separate capabilities—even when one
        person holds multiple roles.
      </p>
      <div className="metric-grid">
        <article>
          <small>PLATFORM ROLES</small>
          <strong>{session.platformRoles.length}</strong>
          <span>{session.platformRoles.join(' · ')}</span>
        </article>
        <article>
          <small>AUTHORIZED WORKSPACES</small>
          <strong>{session.memberships.length}</strong>
          <span>Visible memberships only</span>
        </article>
        <article>
          <small>MAPPING PUBLICATION</small>
          <strong>{capabilities.includes('mapping:publish') ? 'Allowed' : 'Not allowed'}</strong>
          <span>
            {capabilities.includes('mapping:publish')
              ? 'Named approver capability'
              : 'Platform Admin does not inherit it'}
          </span>
        </article>
      </div>
      <div className="empty-state">
        <span>PHASE 01</span>
        <h2>Authority is ready. Operations arrive next.</h2>
        <p>
          Tenant onboarding is intentionally held for Phase 2 after this foundation passes review.
        </p>
      </div>
    </section>
  );
}

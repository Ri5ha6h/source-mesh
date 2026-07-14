import Link from 'next/link';
import type { PropsWithChildren } from 'react';
import { Badge, Button, SourceMeshBrand } from '@source-mesh/ui';
import { getSession } from '../../lib/api';

export default async function AppLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  const canPublish = session.capabilitiesByContext.platform?.includes('mapping:publish') ?? false;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand brand-light" href="/app">
          <SourceMeshBrand />
        </Link>
        <div className="context-label">
          <small>ACTIVE IDENTITY</small>
          <strong>{session.identity.displayName}</strong>
          <span>
            {session.memberships.length} workspace{session.memberships.length === 1 ? '' : 's'}
          </span>
        </div>
        <nav aria-label="Application navigation">
          <Link href="/app">Change context</Link>
          {session.platformRoles.length > 0 ? (
            <Link href="/app/platform">Platform operations</Link>
          ) : null}
          {session.memberships.map((membership) => (
            <Link href={`/app/workspaces/${membership.tenantSlug}`} key={membership.tenantId}>
              {membership.tenantName}
            </Link>
          ))}
          {canPublish ? <span className="nav-capability">Approvals enabled</span> : null}
        </nav>
        <form action="/auth/logout" method="post">
          <Button variant="ghost" type="submit">
            Sign out
          </Button>
        </form>
      </aside>
      <main className="app-main" id="content">
        <header className="topbar">
          <div>
            <small>AUTHENTICATED APPLICATION</small>
            <strong>Explicit context · server authority</strong>
          </div>
          <Badge>Synthetic data</Badge>
        </header>
        {children}
      </main>
    </div>
  );
}

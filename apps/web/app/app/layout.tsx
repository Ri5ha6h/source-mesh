import Link from 'next/link';
import type { PropsWithChildren } from 'react';
import { Badge, Button, SourceMeshBrand } from '@source-mesh/ui';
import { getSession } from '../../lib/api';
import { AppNavigation } from './app-navigation';

export default async function AppLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand brand-light" href="/app">
          <SourceMeshBrand />
        </Link>
        <AppNavigation session={session} />
        <form action="/auth/logout" method="post">
          <Button variant="ghost" type="submit">
            Sign out
          </Button>
        </form>
      </aside>
      <main className="app-main" id="content">
        <header className="topbar">
          <div>
            <small>{session.identity.email}</small>
            <strong>{session.identity.displayName}</strong>
          </div>
          <Badge>Synthetic data</Badge>
        </header>
        {children}
      </main>
    </div>
  );
}

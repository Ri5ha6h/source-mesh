'use client';

import type { Session } from '@source-mesh/contracts';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavigationItem = { href: string; label: string; glyph: string };

function NavigationLink({ href, label, glyph }: NavigationItem) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={active ? 'active' : undefined}
      href={href}
    >
      <span aria-hidden="true" className="nav-glyph">
        {glyph}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function AppNavigation({ session }: { session: Session }) {
  const pathname = usePathname();
  const workspaceSlug = pathname.match(/^\/app\/workspaces\/([^/]+)/)?.[1];
  const membership = session.memberships.find(({ tenantSlug }) => tenantSlug === workspaceSlug);
  const workspaceCapabilities = membership
    ? (session.capabilitiesByContext[`workspace:${membership.tenantId}`] ?? [])
    : [];
  const platformCapabilities = session.capabilitiesByContext.platform ?? [];

  let contextName = 'Workspaces';
  let contextDetail = 'Choose where to work';
  let items: NavigationItem[] = [{ href: '/app', label: 'Select workspace', glyph: '↔' }];

  if (pathname.startsWith('/app/platform')) {
    contextName = 'Platform operations';
    contextDetail = session.platformRoles.map((role) => role.replace('platform_', '')).join(' + ');
    items = [{ href: '/app/platform', label: 'Overview', glyph: '⌂' }];
    if (platformCapabilities.includes('tenant:manage')) {
      items.push({ href: '/app/platform/onboarding', label: 'Tenant onboarding', glyph: '+' });
    }
    if (platformCapabilities.includes('mapping:review')) {
      items.push({ href: '/app/platform/approvals', label: 'Approvals', glyph: '◆' });
    }
  } else if (membership) {
    const root = `/app/workspaces/${membership.tenantSlug}`;
    contextName = membership.tenantName;
    contextDetail = membership.roles.map((role) => role.replace('tenant_', '')).join(' + ');
    items = [
      { href: root, label: 'Overview', glyph: '⌂' },
      { href: `${root}/carriers`, label: 'Carriers', glyph: '◇' },
      { href: `${root}/investigations`, label: 'Investigations', glyph: '⌕' },
    ];
    if (workspaceCapabilities.includes('workspace:configure')) {
      items.push({ href: `${root}/configuration`, label: 'Configuration', glyph: '⚙' });
    }
    if (workspaceCapabilities.includes('member:manage')) {
      items.push({ href: `${root}/settings`, label: 'Workspace settings', glyph: '≡' });
    }
  }

  return (
    <>
      <div className="context-label">
        <small>CURRENT AREA</small>
        <strong>{contextName}</strong>
        <span>{contextDetail}</span>
      </div>
      <nav aria-label="Application navigation">
        {items.map((item) => (
          <NavigationLink key={item.href} {...item} />
        ))}
      </nav>
      {pathname !== '/app' ? (
        <Link className="context-switch" href="/app">
          <span aria-hidden="true">↔</span> Switch workspace
        </Link>
      ) : null}
    </>
  );
}

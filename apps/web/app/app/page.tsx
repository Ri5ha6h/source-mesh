import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '../../lib/api';

export default async function ContextResolverPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (session.lastValidContext?.type === 'platform') redirect('/app/platform');
  if (session.lastValidContext?.type === 'workspace')
    redirect(`/app/workspaces/${session.lastValidContext.tenantSlug}`);
  const contextCount = (session.platformRoles.length > 0 ? 1 : 0) + session.memberships.length;
  if (contextCount === 1 && session.memberships.length === 1)
    redirect(`/app/workspaces/${session.memberships[0]!.tenantSlug}`);
  if (contextCount === 1 && session.platformRoles.length > 0) redirect('/app/platform');

  return (
    <section className="chooser">
      <p className="eyebrow">Authorized contexts</p>
      <h1>Where are you working?</h1>
      {params.reason ? (
        <p className="notice" role="status">
          That workspace is no longer available. Choose an authorized context.
        </p>
      ) : null}
      <div className="context-grid">
        {contextCount === 0 ? (
          <p className="notice" role="status">
            No platform or workspace context is assigned to this identity. Contact an administrator.
          </p>
        ) : null}
        {session.platformRoles.length > 0 ? (
          <Link href="/app/platform">
            <small>PLATFORM</small>
            <strong>Platform operations</strong>
            <span>Cross-workspace responsibilities</span>
          </Link>
        ) : null}
        {session.memberships.map((membership) => (
          <Link href={`/app/workspaces/${membership.tenantSlug}`} key={membership.tenantId}>
            <small>WORKSPACE</small>
            <strong>{membership.tenantName}</strong>
            <span>{membership.roles.join(' · ')}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

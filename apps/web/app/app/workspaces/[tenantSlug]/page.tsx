import Link from 'next/link';
import {
  Badge,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
} from '@source-mesh/ui';
import { getWorkspacePageContext } from './workspace-context';

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { configuration, membership, capabilities } = await getWorkspacePageContext(tenantSlug);
  const root = `/app/workspaces/${tenantSlug}`;
  return (
    <section className="workspace-page compact-page">
      <p className="eyebrow">Workspace overview · Logistics / Ocean</p>
      <div className="page-heading">
        <div>
          <h1>{configuration.tenant.name}</h1>
          <p className="lede">A focused view of source readiness and access for this workspace.</p>
        </div>
        <Badge>{membership.roles.map((role) => role.replace('tenant_', '')).join(' + ')}</Badge>
      </div>

      <div className="configuration-rail" aria-label="Configuration readiness">
        {['Domain', 'Provider', 'Secret', 'Schedule', 'Destination'].map((step, index) => (
          <span className="complete" key={step}>
            <small>0{index + 1}</small>
            {step}
          </span>
        ))}
      </div>

      <div className="route-card-grid">
        <Card>
          <CardHeader>
            <CardTitle>Carriers</CardTitle>
            <CardDescription>
              Review enabled sources, reference types, and schedules.
            </CardDescription>
            <CardAction>
              <Badge tone="success">{configuration.providers.length} ready</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants({ variant: 'outline' })} href={`${root}/carriers`}>
              Open carriers
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Investigations</CardTitle>
            <CardDescription>Search and lineage arrive with the crawl phase.</CardDescription>
            <CardAction>
              <Badge>Phase 3</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Link
              className={buttonVariants({ variant: 'outline' })}
              href={`${root}/investigations`}
            >
              View boundary
            </Link>
          </CardContent>
        </Card>
        {capabilities.includes('workspace:configure') ? (
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Manage dummy provider access, cadence, and output.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                className={buttonVariants({ variant: 'outline' })}
                href={`${root}/configuration`}
              >
                Configure workspace
              </Link>
            </CardContent>
          </Card>
        ) : null}
        {capabilities.includes('member:manage') ? (
          <Card>
            <CardHeader>
              <CardTitle>Workspace settings</CardTitle>
              <CardDescription>
                Review limits, destinations, members, and invitations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={buttonVariants({ variant: 'outline' })} href={`${root}/settings`}>
                Open settings
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}

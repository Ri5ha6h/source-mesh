import Link from 'next/link';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
} from '@source-mesh/ui';
import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/api';

export default async function PlatformOverviewPage() {
  const session = await getSession();
  if (session.platformRoles.length === 0) redirect('/app?reason=platform-unavailable');
  const capabilities = session.capabilitiesByContext.platform ?? [];
  return (
    <section className="workspace-page compact-page">
      <p className="eyebrow">Platform context · explicit authority</p>
      <div className="page-heading">
        <div>
          <h1>Platform operations</h1>
          <p className="lede">Choose the control-plane responsibility assigned to this identity.</p>
        </div>
        <Badge>
          {session.platformRoles.map((role) => role.replace('platform_', '')).join(' + ')}
        </Badge>
      </div>

      <p className="boundary-banner" role="status">
        <strong>Publication boundary:</strong>{' '}
        {capabilities.includes('mapping:publish')
          ? 'This named Platform Approver may review and publish mappings.'
          : 'Platform Admin does not inherit mapping publication.'}
      </p>

      <div className="route-card-grid two-column">
        {capabilities.includes('tenant:manage') ? (
          <Card>
            <CardHeader>
              <CardTitle>Tenant onboarding</CardTitle>
              <CardDescription>
                Create fictional workspaces and control their lifecycle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={buttonVariants()} href="/app/platform/onboarding">
                Open onboarding
              </Link>
            </CardContent>
          </Card>
        ) : null}
        {capabilities.includes('mapping:review') ? (
          <Card>
            <CardHeader>
              <CardTitle>Mapping approvals</CardTitle>
              <CardDescription>
                Review authority is visible now; publication arrives in Phase 4.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={buttonVariants()} href="/app/platform/approvals">
                Open approvals
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}

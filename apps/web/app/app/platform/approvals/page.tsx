import { Badge, Card, CardDescription, CardHeader, CardTitle } from '@source-mesh/ui';
import { redirect } from 'next/navigation';
import { getSession } from '../../../../lib/api';

export default async function PlatformApprovalsPage() {
  const session = await getSession();
  const capabilities = session.capabilitiesByContext.platform ?? [];
  if (!capabilities.includes('mapping:review')) redirect('/app/platform');
  return (
    <section className="workspace-page compact-page">
      <p className="eyebrow">Named human authority · draft only</p>
      <div className="page-heading">
        <div>
          <h1>Mapping approvals</h1>
          <p className="lede">
            The approval route is separated now; publication is implemented in Phase 4.
          </p>
        </div>
        <Badge tone="warning">No drafts yet</Badge>
      </div>
      <Card className="empty-route-state">
        <CardHeader>
          <CardTitle>Nothing is waiting for review</CardTitle>
          <CardDescription>
            Fake suggestions cannot publish themselves. A named Platform Approver remains the only
            publication authority.
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}

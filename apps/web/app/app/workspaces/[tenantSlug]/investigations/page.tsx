import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@source-mesh/ui';
import { getWorkspacePageContext } from '../workspace-context';

export default async function InvestigationsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { configuration, capabilities } = await getWorkspacePageContext(tenantSlug);
  return (
    <section className="workspace-page compact-page">
      <p className="eyebrow">Investigation boundary · {configuration.tenant.name}</p>
      <div className="page-heading">
        <div>
          <h1>Investigations</h1>
          <p className="lede">A dedicated search workspace, ready for Phase 3 crawl lineage.</p>
        </div>
        <Badge>{capabilities.includes('reference:create') ? 'Operator access' : 'Read only'}</Badge>
      </div>

      <Card className="investigation-hero">
        <CardHeader>
          <Badge>Phase 3 boundary</Badge>
          <CardTitle>Find any reference, run, or delivery.</CardTitle>
          <CardDescription>
            Search remains disabled until the dummy provider crawl and canonical lineage are in
            place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            aria-label="Search references"
            disabled
            placeholder="Container, booking, or correlation ID"
          />
        </CardContent>
      </Card>

      <div className="route-card-grid two-column">
        <Card>
          <CardHeader>
            <CardTitle>No synthetic runs yet</CardTitle>
            <CardDescription>
              Phase 3 will seed success, delayed, malformed, timeout, and failure cases.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Authorization is already scoped</CardTitle>
            <CardDescription>
              Evidence access is computed for this workspace and enforced again by the API.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  );
}

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@source-mesh/ui';
import { getWorkspacePageContext } from '../workspace-context';

export default async function CarriersPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { configuration } = await getWorkspacePageContext(tenantSlug);
  return (
    <section className="workspace-page compact-page">
      <p className="eyebrow">Source reliability · {configuration.tenant.name}</p>
      <div className="page-heading">
        <div>
          <h1>Carriers</h1>
          <p className="lede">Enabled dummy sources and their current collection contracts.</p>
        </div>
        <Badge tone="success">All synthetic</Badge>
      </div>

      <div className="carrier-card-grid">
        {configuration.providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <span className="carrier-monogram" aria-hidden="true">
                {provider.providerCode.slice(0, 2).toUpperCase()}
              </span>
              <CardTitle>{provider.displayName}</CardTitle>
              <CardDescription>{provider.referenceTypes.join(' · ')}</CardDescription>
            </CardHeader>
            <CardContent className="carrier-card-content">
              <Badge tone={provider.secretStatus === 'configured' ? 'success' : 'danger'}>
                Credential {provider.secretStatus}
              </Badge>
              <strong>{provider.cadence}</strong>
              <small>{provider.timezone}</small>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="route-panel">
        <CardHeader>
          <CardTitle>Collection schedule</CardTitle>
          <CardDescription>Tenant-scoped provider timing and supported references.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carrier</TableHead>
                <TableHead>References</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Secret boundary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configuration.providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-semibold">
                    {provider.providerCode.toUpperCase()}
                  </TableCell>
                  <TableCell>{provider.referenceTypes.join(' · ')}</TableCell>
                  <TableCell>
                    <code>{provider.cadence}</code>
                  </TableCell>
                  <TableCell>
                    <Badge tone={provider.secretStatus === 'configured' ? 'success' : 'danger'}>
                      {provider.secretStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

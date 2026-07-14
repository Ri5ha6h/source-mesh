import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@source-mesh/ui';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createTenant,
  getSession,
  getTenantDirectory,
  transitionTenant,
} from '../../../../lib/api';

async function addTenant(formData: FormData) {
  'use server';
  await createTenant({ name: String(formData.get('name')), slug: String(formData.get('slug')) });
  revalidatePath('/app/platform/onboarding');
}

async function changeTenantStatus(formData: FormData) {
  'use server';
  await transitionTenant(
    String(formData.get('slug')),
    String(formData.get('status')) as 'active' | 'suspended',
  );
  revalidatePath('/app/platform/onboarding');
}

export default async function TenantOnboardingPage() {
  const session = await getSession();
  const capabilities = session.capabilitiesByContext.platform ?? [];
  if (!capabilities.includes('tenant:manage')) redirect('/app/platform');
  const directory = await getTenantDirectory();
  return (
    <section className="workspace-page compact-page">
      <p className="eyebrow">Control plane · tenant registry</p>
      <div className="page-heading">
        <div>
          <h1>Tenant onboarding</h1>
          <p className="lede">
            Create fictional workspaces and advance only valid lifecycle transitions.
          </p>
        </div>
        <Badge>{directory.tenants.length} synthetic tenants</Badge>
      </div>

      <div className="onboarding-layout">
        <Card className="route-panel">
          <CardHeader>
            <CardTitle>Workspace registry</CardTitle>
            <CardDescription>Managed by {directory.actor}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lifecycle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directory.tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-semibold">{tenant.name}</TableCell>
                    <TableCell>
                      <code>{tenant.slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge tone={tenant.status === 'active' ? 'success' : 'warning'}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <form action={changeTenantStatus}>
                        <input name="slug" type="hidden" value={tenant.slug} />
                        <input
                          name="status"
                          type="hidden"
                          value={tenant.status === 'active' ? 'suspended' : 'active'}
                        />
                        <Button size="sm" type="submit" variant="outline">
                          {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="onboarding-form-card">
          <CardHeader>
            <CardTitle>New workspace</CardTitle>
            <CardDescription>Begins in provisioning.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addTenant} className="configuration-form">
              <Field>
                <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
                <Input id="workspace-name" name="name" placeholder="Harborline Demo" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="workspace-slug">Route slug</FieldLabel>
                <Input
                  id="workspace-slug"
                  name="slug"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="harborline-demo"
                  required
                />
                <FieldDescription>Lowercase words separated by hyphens.</FieldDescription>
              </Field>
              <Button type="submit">Create workspace</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

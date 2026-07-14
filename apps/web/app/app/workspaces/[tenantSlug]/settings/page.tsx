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
  NativeSelect,
} from '@source-mesh/ui';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { inviteMember } from '../../../../../lib/api';
import { getWorkspacePageContext } from '../workspace-context';

async function sendInvitation(formData: FormData) {
  'use server';
  const tenantSlug = String(formData.get('tenantSlug'));
  await inviteMember(tenantSlug, {
    email: String(formData.get('email')),
    role: String(formData.get('role')) as 'tenant_admin' | 'tenant_operator' | 'tenant_viewer',
  });
  revalidatePath(`/app/workspaces/${tenantSlug}/settings`);
}

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { configuration, capabilities } = await getWorkspacePageContext(tenantSlug);
  if (!capabilities.includes('member:manage')) redirect(`/app/workspaces/${tenantSlug}`);
  return (
    <section className="workspace-page compact-page">
      <p className="eyebrow">Workspace administration · {configuration.tenant.name}</p>
      <div className="page-heading">
        <div>
          <h1>Workspace settings</h1>
          <p className="lede">
            Manage membership while reviewing the tenant-owned run envelope and outputs.
          </p>
        </div>
        <Badge>{configuration.members.length} active members</Badge>
      </div>

      <div className="settings-grid">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Active fictional identities in this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="member-list">
            {configuration.members.map((member) => (
              <article key={member.email}>
                <div>
                  <strong>{member.displayName}</strong>
                  <small>{member.email}</small>
                </div>
                <Badge>{member.roles.map((role) => role.replace('tenant_', '')).join(' + ')}</Badge>
              </article>
            ))}
            {configuration.invitations.map((invitation) => (
              <article key={invitation.email}>
                <div>
                  <strong>{invitation.email}</strong>
                  <small>{invitation.role.replace('tenant_', '')}</small>
                </div>
                <Badge tone="warning">{invitation.status}</Badge>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite a dummy user</CardTitle>
            <CardDescription>
              Only synthetic `example.test` identities are accepted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={sendInvitation} className="configuration-form">
              <input name="tenantSlug" type="hidden" value={tenantSlug} />
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  pattern=".+@example\.test"
                  placeholder="operator@example.test"
                  required
                  type="email"
                />
                <FieldDescription>No invitation leaves the local environment.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="role">Workspace role</FieldLabel>
                <NativeSelect id="role" name="role">
                  <option value="tenant_viewer">Viewer</option>
                  <option value="tenant_operator">Operator</option>
                  <option value="tenant_admin">Admin</option>
                </NativeSelect>
              </Field>
              <Button type="submit">Create invitation</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="settings-grid summary-settings">
        <Card>
          <CardHeader>
            <CardTitle>Run envelope</CardTitle>
          </CardHeader>
          <CardContent className="manifest-list">
            <div>
              <span>Requests / minute</span>
              <strong>{configuration.limits.requestsPerMinute}</strong>
            </div>
            <div>
              <span>Concurrent crawls</span>
              <strong>{configuration.limits.concurrentCrawls}</strong>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Local destinations</CardTitle>
          </CardHeader>
          <CardContent className="member-list">
            {configuration.destinations.map((destination) => (
              <article key={destination.id}>
                <div>
                  <strong>{destination.name}</strong>
                  <small>{destination.type}</small>
                </div>
                <Badge>{destination.format.toUpperCase()}</Badge>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

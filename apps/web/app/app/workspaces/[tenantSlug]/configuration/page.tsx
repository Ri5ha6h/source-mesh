import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  NativeSelect,
} from '@source-mesh/ui';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { configureWorkspace } from '../../../../../lib/api';
import { getWorkspacePageContext } from '../workspace-context';

async function saveConfiguration(formData: FormData) {
  'use server';
  const tenantSlug = String(formData.get('tenantSlug'));
  await configureWorkspace(tenantSlug, {
    providerCode: String(formData.get('providerCode')) as 'msc' | 'maersk',
    displayName: String(formData.get('displayName')),
    referenceTypes: formData.getAll('referenceTypes') as ('container' | 'booking')[],
    credential: String(formData.get('credential')),
    cadence: String(formData.get('cadence')) as
      | '*/5 * * * *'
      | '*/15 * * * *'
      | '*/30 * * * *'
      | '0 * * * *',
    timezone: String(formData.get('timezone')) as 'UTC' | 'Europe/Copenhagen',
    requestsPerMinute: Number(formData.get('requestsPerMinute')),
    concurrentCrawls: Number(formData.get('concurrentCrawls')),
    destinationType: String(formData.get('destinationType')) as 'download' | 'webhook',
    destinationFormat: String(formData.get('destinationFormat')) as 'json' | 'xml',
  });
  revalidatePath(`/app/workspaces/${tenantSlug}`);
  revalidatePath(`/app/workspaces/${tenantSlug}/carriers`);
  revalidatePath(`/app/workspaces/${tenantSlug}/configuration`);
  revalidatePath(`/app/workspaces/${tenantSlug}/settings`);
}

export default async function ConfigurationPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { configuration, capabilities } = await getWorkspacePageContext(tenantSlug);
  if (!capabilities.includes('workspace:configure')) redirect(`/app/workspaces/${tenantSlug}`);
  const provider = configuration.providers[0];
  return (
    <section className="workspace-page compact-page">
      <p className="eyebrow">Collection contract · {configuration.tenant.name}</p>
      <div className="page-heading">
        <div>
          <h1>Configuration</h1>
          <p className="lede">
            Change one dummy provider contract without exposing stored credentials.
          </p>
        </div>
        <Badge tone="warning">Write-only secrets</Badge>
      </div>

      <Card className="route-panel configuration-editor">
        <CardHeader>
          <CardTitle>Dummy provider contract</CardTitle>
          <CardDescription>
            The worker will call the versioned HTTP stub; credentials are never returned to this
            page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveConfiguration} className="configuration-form form-grid">
            <input name="tenantSlug" type="hidden" value={tenantSlug} />
            <Field>
              <FieldLabel htmlFor="providerCode">Provider</FieldLabel>
              <NativeSelect
                defaultValue={provider?.providerCode ?? 'msc'}
                id="providerCode"
                name="providerCode"
              >
                <option value="msc">MSC dummy API</option>
                <option value="maersk">Maersk dummy API</option>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="displayName">Display name</FieldLabel>
              <Input
                defaultValue={provider?.displayName ?? 'MSC dummy connector'}
                id="displayName"
                name="displayName"
                required
              />
            </Field>
            <FieldSet>
              <FieldLegend>Reference types</FieldLegend>
              <FieldLabel className="check">
                <Checkbox defaultChecked name="referenceTypes" value="container" /> Container
              </FieldLabel>
              <FieldLabel className="check">
                <Checkbox
                  defaultChecked={provider?.referenceTypes.includes('booking')}
                  name="referenceTypes"
                  value="booking"
                />{' '}
                Booking
              </FieldLabel>
            </FieldSet>
            <Field>
              <FieldLabel htmlFor="credential">Dummy credential</FieldLabel>
              <Input
                autoComplete="new-password"
                id="credential"
                name="credential"
                placeholder="Non-sensitive placeholder"
                required
                type="password"
              />
              <FieldDescription>
                Re-enter a placeholder to rotate the opaque secret reference.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="cadence">Cadence</FieldLabel>
              <NativeSelect
                defaultValue={provider?.cadence ?? '*/15 * * * *'}
                id="cadence"
                name="cadence"
              >
                <option value="*/5 * * * *">Every 5 minutes</option>
                <option value="*/15 * * * *">Every 15 minutes</option>
                <option value="*/30 * * * *">Every 30 minutes</option>
                <option value="0 * * * *">Hourly</option>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
              <NativeSelect
                defaultValue={provider?.timezone ?? 'UTC'}
                id="timezone"
                name="timezone"
              >
                <option value="UTC">UTC</option>
                <option value="Europe/Copenhagen">Europe/Copenhagen</option>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="requestsPerMinute">Requests / minute</FieldLabel>
              <Input
                defaultValue={configuration.limits.requestsPerMinute}
                id="requestsPerMinute"
                max="60"
                min="1"
                name="requestsPerMinute"
                required
                type="number"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="concurrentCrawls">Concurrent crawls</FieldLabel>
              <Input
                defaultValue={configuration.limits.concurrentCrawls}
                id="concurrentCrawls"
                max="10"
                min="1"
                name="concurrentCrawls"
                required
                type="number"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="destinationType">Destination</FieldLabel>
              <NativeSelect
                defaultValue={configuration.destinations[0]?.type ?? 'download'}
                id="destinationType"
                name="destinationType"
              >
                <option value="download">Local download</option>
                <option value="webhook">Dummy webhook</option>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="destinationFormat">Format</FieldLabel>
              <NativeSelect
                defaultValue={configuration.destinations[0]?.format ?? 'json'}
                id="destinationFormat"
                name="destinationFormat"
              >
                <option value="json">JSON</option>
                <option value="xml">XML</option>
              </NativeSelect>
            </Field>
            <Button type="submit">Save configuration</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

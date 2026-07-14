import Link from 'next/link';
import { Button, Card, SourceMeshBrand } from '@source-mesh/ui';

const accounts = [
  ['avery-admin', 'Platform Admin', 'Tenant lifecycle; cannot publish mappings'],
  ['rina-approver', 'Platform Approver', 'Mapping review and publication'],
  ['tomas-admin', 'Tenant Admin', 'Acme Europe configuration'],
  ['priya-operator', 'Operator + Approver', 'Two workspaces and platform approval'],
  ['victor-viewer', 'Tenant Viewer', 'Northstar read-only context'],
] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main className="login-page">
      <section className="login-intro">
        <Link className="brand brand-light" href="/">
          <SourceMeshBrand />
        </Link>
        <p className="eyebrow">One secure entry</p>
        <h1>Choose work by context, not by a different login.</h1>
        <p>
          Keycloak verifies identity. Source Mesh resolves active roles, memberships, and
          capabilities for every request.
        </p>
        <div className="boundary-note">
          <span>01</span>
          <div>
            <strong>Authentication is shared.</strong>
            <small>
              Authority remains explicit at platform, workspace, repository, and row-policy
              boundaries.
            </small>
          </div>
        </div>
      </section>
      <section className="login-panel">
        <Card className="login-card">
          <p className="eyebrow">Synthetic POC identities</p>
          <h2>Sign in to the local environment</h2>
          {reason === 'expired' ? (
            <p className="notice" role="status">
              Your access expired. Sign in again to continue.
            </p>
          ) : null}
          <p>
            Every account uses the dummy password <code>source-mesh</code>.
          </p>
          <Button asChild size="wide">
            <Link href="/auth/login">Continue to Keycloak</Link>
          </Button>
          <div className="account-list">
            {accounts.map(([user, role, description]) => (
              <article key={user}>
                <code>{user}</code>
                <div>
                  <strong>{role}</strong>
                  <small>{description}</small>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}

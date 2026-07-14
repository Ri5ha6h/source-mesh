import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const screenshotDirectory = resolve('../../artifacts/screenshots');
test.beforeAll(async () => mkdir(screenshotDirectory, { recursive: true }));

async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Continue to Keycloak' }).click();
  await page.locator('#username').fill(username);
  await page.locator('#password').fill('source-mesh');
  await page.locator('#kc-login').click();
  await page.waitForURL(/localhost:3000\/app/);
}

test('platform admin onboards and activates a fictional tenant', async ({ page }) => {
  await login(page, 'avery-admin');
  await page.getByRole('link', { name: 'Tenant onboarding' }).click();
  const suffix = Date.now();
  const name = `Harborline ${suffix}`;
  await page.getByLabel('Workspace name').fill(name);
  await page.getByLabel('Route slug').fill(`harborline-${suffix}`);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row.getByText('provisioning')).toBeVisible();
  await row.getByRole('button', { name: 'Activate' }).click();
  await expect(row.getByText('active')).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.screenshot({
    path: `${screenshotDirectory}/phase-two-onboarding.png`,
    fullPage: true,
  });
});

test('tenant admin configures one fictional workspace without changing the other', async ({
  page,
}) => {
  await login(page, 'tomas-admin');
  await expect(page.getByRole('heading', { name: 'Acme Europe' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Workspace settings' })).toBeVisible();
  await page.getByRole('link', { name: 'Configuration' }).click();
  await expect(page.getByLabel('Display name')).toHaveValue('MSC dummy connector');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByLabel('Display name').fill('MSC reviewed connector');
  await page.getByLabel('Dummy credential').fill('manual-review-placeholder');
  await page.getByRole('button', { name: 'Save configuration' }).click();
  await expect(page.getByLabel('Display name')).toHaveValue('MSC reviewed connector');

  const invitationEmail = `qa.${Date.now()}@example.test`;
  await page.getByRole('link', { name: 'Workspace settings' }).click();
  await page.getByLabel('Email').fill(invitationEmail);
  await page.getByRole('button', { name: 'Create invitation' }).click();
  await expect(page.getByText(invitationEmail)).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.screenshot({
    path: `${screenshotDirectory}/phase-two-acme-configured.png`,
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(page, 'priya-operator');
  await expect(page.getByRole('link', { name: 'Configuration' })).not.toBeVisible();
  await page.goto('/app/workspaces/northstar-logistics/carriers');
  await expect(page.getByText('Maersk dummy connector')).toBeVisible();
  await expect(page.getByText('MSC reviewed connector')).not.toBeVisible();

  await page.goto('/app/platform');
  await expect(page.getByRole('heading', { name: 'Platform operations' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Approvals', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tenant onboarding' })).not.toBeVisible();
});

test('direct API calls cannot bypass tenant context or configuration capability', async ({
  request,
}) => {
  const tokenResponse = await request.post(
    'http://localhost:8080/realms/source-mesh/protocol/openid-connect/token',
    {
      form: {
        client_id: 'source-mesh-web',
        client_secret: 'dummy-source-mesh-client-secret',
        grant_type: 'password',
        username: 'victor-viewer',
        password: 'source-mesh',
      },
    },
  );
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };
  const headers = { authorization: `Bearer ${accessToken}` };
  const crossTenant = await request.get(
    'http://localhost:4000/v1/workspaces/acme-europe/configuration',
    { headers },
  );
  expect(crossTenant.status()).toBe(404);
  expect(await crossTenant.json()).toEqual({ error: 'workspace_not_found' });

  const bypass = await request.post(
    'http://localhost:4000/v1/workspaces/northstar-logistics/configuration',
    {
      headers,
      data: {
        providerCode: 'maersk',
        displayName: 'Bypass attempt',
        referenceTypes: ['container'],
        credential: 'must-not-write',
        cadence: '*/15 * * * *',
        timezone: 'UTC',
        requestsPerMinute: 10,
        concurrentCrawls: 2,
        destinationType: 'download',
        destinationFormat: 'json',
      },
    },
  );
  expect(bypass.status()).toBe(403);
  expect(await bypass.json()).toEqual({ error: 'operation_not_permitted' });
});

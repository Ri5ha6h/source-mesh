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

test('public and login surfaces are accessible at desktop and mobile widths', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'From reference to result, nothing disappears.' }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `${screenshotDirectory}/public-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(
    page.getByRole('heading', { name: 'Sign in to the local environment' }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `${screenshotDirectory}/login-mobile.png`, fullPage: true });
});

test('context resolution and capability boundaries survive deep links', async ({
  page,
  context,
}) => {
  await login(page, 'priya-operator');
  await expect(page.getByRole('heading', { name: 'Where are you working?' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Platform operations/ })).toBeVisible();
  await page.getByRole('link', { name: /Acme Europe/ }).click();
  await expect(page.getByRole('heading', { name: 'Acme Europe' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Switch workspace' })).toBeVisible();
  await page.getByRole('link', { name: 'Carriers', exact: true }).click();
  await expect(page.getByText('MSC dummy connector')).toBeVisible();
  await page.goto('/app/workspaces/northstar-logistics/carriers');
  await expect(page.getByRole('heading', { name: 'Carriers' })).toBeVisible();
  await expect(page.getByText('Maersk dummy connector')).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/workspace-desktop.png`, fullPage: true });

  await context.clearCookies();
  await login(page, 'victor-viewer');
  await expect(page.getByRole('heading', { name: 'Northstar Logistics' })).toBeVisible();
  await page.goto('/app/workspaces/acme-europe');
  await expect(page.getByRole('heading', { name: 'Northstar Logistics' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Configuration' })).not.toBeVisible();

  await context.clearCookies();
  await login(page, 'avery-admin');
  await expect(page.getByRole('heading', { name: 'Platform operations' })).toBeVisible();
  await expect(
    page.getByText('Platform Admin does not inherit mapping publication.'),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshotDirectory}/platform-admin-desktop.png`,
    fullPage: true,
  });
});

test('signing out ends the Keycloak session and permits a different account', async ({ page }) => {
  await login(page, 'avery-admin');
  await expect(page.getByRole('heading', { name: 'Platform operations' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('http://localhost:3000/login');
  await page.getByRole('link', { name: 'Continue to Keycloak' }).click();
  await expect(page.locator('#username')).toBeVisible();

  await page.locator('#username').fill('victor-viewer');
  await page.locator('#password').fill('source-mesh');
  await page.locator('#kc-login').click();
  await expect(page.getByRole('heading', { name: 'Northstar Logistics' })).toBeVisible();
  await expect(page.getByText('Victor Viewer')).toBeVisible();
});

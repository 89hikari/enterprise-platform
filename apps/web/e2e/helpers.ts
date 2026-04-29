import { Page } from '@playwright/test';

const KEYCLOAK_URL  = process.env.E2E_KEYCLOAK_URL  ?? 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.E2E_KEYCLOAK_REALM ?? 'enterprise';
const CLIENT_ID      = process.env.E2E_CLIENT_ID      ?? 'enterprise-app';
const TEST_USER      = process.env.E2E_USER            ?? 'admin@example.com';
const TEST_PASSWORD  = process.env.E2E_PASSWORD        ?? 'admin';

/**
 * Logs in via Keycloak OIDC redirect and returns to the app.
 * Saves auth state so subsequent tests in the same worker skip the login UI.
 */
export async function login(page: Page) {
  await page.goto('/dashboard');

  // Wait for Keycloak login page
  await page.waitForURL(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/**`, { timeout: 15_000 });

  await page.fill('#username', TEST_USER);
  await page.fill('#password', TEST_PASSWORD);
  await page.click('[type=submit]');

  // Back to the app
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

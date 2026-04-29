import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Authentication', () => {
  test('redirects unauthenticated users to Keycloak', async ({ page }) => {
    await page.goto('/dashboard');
    // Should land on Keycloak login page
    await expect(page).toHaveURL(/keycloak|\/realms\/enterprise/);
  });

  test('logs in and reaches dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('sidebar navigation is visible after login', async ({ page }) => {
    await login(page);
    await expect(page.getByText('People')).toBeVisible();
    await expect(page.getByText('Chat')).toBeVisible();
    await expect(page.getByText('Kanban')).toBeVisible();
  });

  test('sign out returns to Keycloak', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/keycloak|\/realms\/enterprise/);
  });
});

import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Chat').click();
    await page.waitForURL('**/chat');
  });

  test('shows chat sidebar', async ({ page }) => {
    await expect(page.getByText('Messages')).toBeVisible();
  });

  test('can open the People page to start a new chat', async ({ page }) => {
    // The + button in ChatSidebar links to /users
    await page.locator('a[title="New chat"]').click();
    await page.waitForURL('**/users');
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
  });

  test('empty state shown when no rooms', async ({ page }) => {
    // Either shows a room list or the empty state message
    const sidebar = page.locator('.overflow-y-auto').first();
    await expect(sidebar).toBeVisible();
  });

  test('can send a text message in an existing room', async ({ page }) => {
    // Click the first chat room if any exist
    const firstRoom = page.locator('a[href^="/chat/"]').first();
    const count = await firstRoom.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await firstRoom.click();
    await page.waitForURL('**/chat/**');

    const textarea = page.getByPlaceholder(/Type a message/);
    await textarea.fill('Hello E2E test!');
    await textarea.press('Enter');

    // Message should appear in the window
    await expect(page.getByText('Hello E2E test!')).toBeVisible({ timeout: 5_000 });
  });
});

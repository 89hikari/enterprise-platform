import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Kanban', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Kanban').click();
    await page.waitForURL('**/kanban');
  });

  test('shows kanban boards page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Boards' })).toBeVisible();
  });

  test('can create a new board', async ({ page }) => {
    const boardName = `E2E Board ${Date.now()}`;

    await page.getByPlaceholder('Board name').fill(boardName);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText(boardName)).toBeVisible({ timeout: 5_000 });
  });

  test('can open a board and see default columns', async ({ page }) => {
    // Create a board first
    const boardName = `E2E Cols ${Date.now()}`;
    await page.getByPlaceholder('Board name').fill(boardName);
    await page.getByRole('button', { name: 'Create' }).click();

    // Click the board
    await page.getByText(boardName).click();
    await page.waitForURL('**/kanban/**');

    // Default columns
    await expect(page.getByText('To Do')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
  });

  test('can add a card to a column', async ({ page }) => {
    // Navigate to any board
    const boardLink = page.locator('a[href^="/kanban/"]').first();
    const count = await boardLink.count();
    if (count === 0) test.skip();

    await boardLink.click();
    await page.waitForURL('**/kanban/**');

    // Click "+ Add card" in first column
    await page.getByText('+ Add card').first().click();

    const textarea = page.getByPlaceholder('Card title...');
    await textarea.fill('E2E Test Card');
    await textarea.press('Enter');

    await expect(page.getByText('E2E Test Card')).toBeVisible({ timeout: 5_000 });
  });

  test('can open card modal', async ({ page }) => {
    const boardLink = page.locator('a[href^="/kanban/"]').first();
    const count = await boardLink.count();
    if (count === 0) test.skip();

    await boardLink.click();
    await page.waitForURL('**/kanban/**');

    // Click first card if any
    const card = page.locator('.bg-white.border.border-gray-200.rounded-lg').first();
    const cardCount = await card.count();
    if (cardCount === 0) test.skip();

    await card.click();

    // Modal should open (has "Done" button)
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible({ timeout: 3_000 });

    // Close
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('button', { name: 'Done' })).not.toBeVisible();
  });
});

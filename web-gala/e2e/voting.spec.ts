import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, mockAuth, mockRegisteredUser } from './helpers';

test.describe('Voting System', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'user');
    await mockRegisteredUser(page);
    await mockGlobalConfig(page);
    await mockTimeSlots(page);

    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            category: 'Best Student',
            options: ['Alice', 'Bob', 'Charlie'],
            photo_paths: ['https://placehold.co/32', 'https://placehold.co/32', 'https://placehold.co/32'],
            already_voted: null
          }
        ]
      });
    });

    await page.route('**/api/gala/v1/voting/categories/1/vote', async route => {
      await route.fulfill({ json: { status: 'success' } });
    });
  });

  test('should display voting categories and submit a vote', async ({ page }) => {
    await page.goto('./vote');

    await expect(page.locator('text=Votações').first()).toBeVisible();
    await expect(page.locator('text=Best Student')).toBeVisible();

    const aliceBtn = page.getByText('Alice', { exact: true });
    await expect(aliceBtn).toBeVisible();
    await aliceBtn.click();

    const submitBtn = page.getByRole('button', { name: /Enviar votações/i });
    await submitBtn.click();

    await expect(page.getByRole('heading', { name: 'Sucesso!' })).toBeVisible();
  });
});

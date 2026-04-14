import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, createAuthState } from './helpers';

test.describe('Voting System', () => {
  // Use registered user
  test.use({ storageState: createAuthState('user', true) });

  test.beforeEach(async ({ page }) => {
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
    
    // Mock the categories response
    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            category: "Best Student",
            options: ["Alice", "Bob", "Charlie"],
            photo_paths: [],
            already_voted: null
          }
        ]
      });
    });

    // Mock voting action
    await page.route('**/api/gala/v1/voting/categories/1/vote', async route => {
      await route.fulfill({ json: { status: 'success' } });
    });
  });

  test('should display voting categories and submit a vote', async ({ page }) => {
    await page.goto('/voting');
    
    await expect(page.locator('text=Votações').first()).toBeVisible();
    await expect(page.locator('text=Best Student')).toBeVisible();

    // The options are rendered. "Alice" should be clickable.
    // In VoteCard component, we may map options. Let's find Alice.
    const aliceBtn = page.getByText('Alice', { exact: true });
    await expect(aliceBtn).toBeVisible();

    // Click to select
    await aliceBtn.click();

    // Submit Votações (Enviar votações)
    const submitBtn = page.getByRole('button', { name: /Enviar votações/i });
    await submitBtn.click();

    // Expect success message
    await expect(page.locator('text=Sucesso!')).toBeVisible();
  });
});

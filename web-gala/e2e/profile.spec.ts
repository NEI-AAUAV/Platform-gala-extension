import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, createAuthState } from './helpers';

test.describe('Profile System', () => {
  // Use registered user
  test.use({ storageState: createAuthState('user', true) });

  test.beforeEach(async ({ page }) => {
    await mockGlobalConfig(page);
    await mockTimeSlots(page);

    // Mock getting table group
    await page.route('**/api/gala/v1/user/me/table', async route => {
      await route.fulfill({
        json: {
          _id: 1,
          name: "Test Table Group",
          users: [
            { id: 1, name: "Test", surname: "User" }
          ]
        }
      });
    });
    
    // Mock user list for transfer
    await page.route('**/api/gala/v1/user/', async route => {
      await route.fulfill({ json: [] });
    });
  });

  test('should display table group in profile', async ({ page }) => {
    await page.goto('/profile');
    
    // Dashboard should show "Bilhete" and "A minha mesa"
    await expect(page.locator('text=A minha mesa').first()).toBeVisible();
    await expect(page.locator('text=Test Table Group').first()).toBeVisible();
  });
});

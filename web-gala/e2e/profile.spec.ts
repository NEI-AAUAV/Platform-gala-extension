import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, mockAuth, mockRegisteredUser } from './helpers';

test.describe('Profile System', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'user');
    await mockRegisteredUser(page);
    await mockGlobalConfig(page);
    await mockTimeSlots(page);

    await page.route('**/api/gala/v1/table/list', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            name: 'Test Table Group',
            head: 1,
            seats: 8,
            persons: [{ _id: 1, name: 'Test', surname: 'User', companions: [] }],
          }
        ]
      });
    });
  });

  test('should display table group in profile', async ({ page }) => {
    await page.goto('./profile');

    await expect(page.locator('text=Mesa').first()).toBeVisible();

    await page.click('text=Mesa');
    await expect(page.locator('text=Test Table Group').first()).toBeVisible();
  });
});

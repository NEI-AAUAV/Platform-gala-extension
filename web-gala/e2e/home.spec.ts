import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots } from './helpers';

test.describe('Gala Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/nei/v1/auth/refresh/', async route => {
      await route.fulfill({ status: 401, json: {} });
    });
  });

  test('should display hero section and navigation links', async ({ page }) => {
    await page.goto('./');

    const logo = page.locator('img[alt="NEI Logo"]').first();
    await expect(logo).toBeVisible();
  });

  test('should show login and registration buttons for unauthenticated users', async ({ page }) => {
    await page.goto('./');

    const header = page.locator('header');
    await expect(header.getByText('Entrar')).toBeVisible();
    await expect(header.getByText('Inscrever')).toBeVisible();
  });
});

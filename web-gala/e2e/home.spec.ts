import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, createAuthState } from './helpers';

test.describe('Gala Home Page', () => {
  test.use({ storageState: createAuthState('unauth') });

  test.beforeEach(async ({ page }) => {
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({ json: [] });
    });
  });

  test('should display hero section and navigation links', async ({ page }) => {
    await page.goto('/');

    const logo = page.locator('img[alt="NEI Logo"]');
    await expect(logo).toBeVisible();

    // Check header links
    const header = page.locator('header');
    await expect(header.getByText('Sobre', { exact: true })).toBeVisible();
    await expect(header.getByText('Fases', { exact: true })).toBeVisible();
    await expect(header.getByText('Nomeados', { exact: true })).toBeVisible();
  });

  test('should show login and registration buttons for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    const header = page.locator('header');
    await expect(header.getByText('Entrar')).toBeVisible();
    await expect(header.getByText('Inscrever')).toBeVisible();
  });
});

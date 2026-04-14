import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, createAuthState } from './helpers';

test.describe('Admin Panel as Admin', () => {
  // Use admin role
  test.use({ storageState: createAuthState('admin', true) });

  test.beforeEach(async ({ page }) => {
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
    await page.route('**/api/gala/v1/admin/registrations', async route => {
      await route.fulfill({ json: [] });
    });
    // For updates
    await page.route('**/api/gala/v1/admin/config', async route => {
      await route.fulfill({ json: { status: 'success' } });
    });
  });

  test('should load admin dashboard and allow configuration navigation', async ({ page }) => {
    await page.goto('/admin');
    
    // Admin navigation tabs
    await expect(page.locator('text=Inscrições')).toBeVisible();
    await expect(page.locator('text=Configurações')).toBeVisible();
    await expect(page.locator('text=Votações')).toBeVisible();
    
    // Config should be pre-filled with the mock
    await page.click('text=Configurações');
    const inputName = page.locator('input[name="event_name"]');
    await expect(inputName).toHaveValue('Gala E2E');
  });
});

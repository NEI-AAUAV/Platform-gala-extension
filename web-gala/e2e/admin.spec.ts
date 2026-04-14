import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, mockAuth, mockSessionUser } from './helpers';

test.describe('Admin Panel as Admin', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'admin');
    await mockSessionUser(page, true);
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
    await page.route('**/api/gala/v1/admin/registrations', async route => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/gala/v1/limits', async route => {
      await route.fulfill({ json: { maxRegistrations: 100, maxBusSeats: 50, maxTablesCount: 20 } });
    });
  });

  test('should load admin dashboard and allow configuration navigation', async ({ page }) => {
    await page.goto('./admin');

    await expect(page.locator('text=Inscrições').first()).toBeVisible();
    await expect(page.locator('text=Mesas').first()).toBeVisible();
    await expect(page.locator('text=Categorias').first()).toBeVisible();

    await page.click('text=Categorias');
    await expect(page.locator('text=Gestão de Categorias')).toBeVisible();
  });
});

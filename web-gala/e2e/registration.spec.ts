import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, mockAuth, mockUnregisteredUser } from './helpers';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'user');
    await mockUnregisteredUser(page);
    await mockGlobalConfig(page);
    await mockTimeSlots(page);

    await page.route('**/api/gala/v1/registration/status', async route => {
      await route.fulfill({
        json: {
          is_registered: false,
          registration_step: 1,
          has_payed: false
        }
      });
    });

    await page.route('**/api/gala/v1/registration/step/1', async route => {
      await route.fulfill({ json: { success: true } });
    });
  });

  test('should go through the first step of the registration wizard', async ({ page }) => {
    await page.goto('./register');

    await expect(page.locator('text=Informações do Evento').first()).toBeVisible();
    await expect(page.locator('text=Detalhes do Evento').first()).toBeVisible();

    const nextBtn = page.getByRole('button', { name: /Prosseguir para Inscrição/i });
    await expect(nextBtn).toBeVisible();
  });
});

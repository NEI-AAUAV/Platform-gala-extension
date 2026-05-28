import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, mockAuth, mockRegisteredUser } from './helpers';

async function mockProfileSupportRoutes(page: import('@playwright/test').Page) {
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

  await page.route('**/api/gala/v1/table/my-invites', async route => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/gala/v1/limits', async route => {
    await route.fulfill({ json: { maxRegistrations: 100, maxBusSeats: 50, maxTablesCount: 20 } });
  });
}

test.describe('Profile System', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'user');
    await mockRegisteredUser(page);
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
    await mockProfileSupportRoutes(page);
  });

  test('should display table group in profile', async ({ page }) => {
    await page.goto('./profile');

    await expect(page.locator('text=Mesa').first()).toBeVisible();

    await page.click('text=Mesa');
    await expect(page.locator('text=Test Table Group').first()).toBeVisible();
  });
});

test.describe('Profile payment expiration', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'user');
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
    await mockProfileSupportRoutes(page);
  });

  test('shows deactivated registration without freeing the table seat', async ({ page }) => {
    await page.route('**/api/gala/v1/user/me', async (route) => {
      await route.fulfill({
        json: {
          _id: 1,
          name: 'Test',
          surname: 'User',
          email: 'user@ua.pt',
          nmec: 12345,
          matriculation: 2,
          bus_option: 'NONE',
          meal_option: 'NOR',
          food_allergies: '',
          has_payed: false,
          phased_payment: false,
          payment_proof_url: null,
          payment_proof_url_phase2: null,
          payment_phase1_confirmed: false,
          payment_phase2_confirmed: false,
          payment_expired: true,
          registration_active: false,
          companions: [],
          bus_assignment: null,
          registration_step: 6,
          phone: null,
          is_registered: true,
          table_id: 1,
        },
      });
    });

    await page.goto('./profile');

    await expect(page.getByText('Cancelada')).toBeVisible();

    await page.getByRole('button', { name: 'Pagamento' }).click();
    await expect(page.getByText('Prazo de envio encerrado')).toBeVisible();
    await expect(page.getByText('Clica ou arrasta o comprovativo')).not.toBeVisible();

    await page.getByRole('button', { name: 'Mesa' }).click();
    await expect(page.getByText('Test Table Group')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { disableAnimations, mockAuth, mockTimeSlots, mockUnregisteredUser } from './helpers';

async function mockPaymentDeadlineFlow(page: import('@playwright/test').Page) {
  await mockAuth(page, 'user');
  await mockUnregisteredUser(page);
  await mockTimeSlots(page);

  await page.route('**/api/gala/v1/registration/capacity', async (route) => {
    await route.fulfill({ json: { remaining: 50, total: 100, bus_remaining: 50 } });
  });

  await page.route('**/api/gala/v1/config', async (route) => {
    await route.fulfill({
      json: {
        _id: 'GLOBAL_CONFIG',
        event_name: 'Gala E2E',
        event_location: 'Aveiro',
        items_included: [],
        rules: [],
        prices: {
          total_price: 35,
          phased_payment_enabled: true,
          phase1_amount: 20,
          phase1_deadline: '2020-01-01',
          phase2_amount: 15,
          phase2_deadline: '2030-01-01',
          iban: 'PT50000000000000000000000',
          holder: 'NEI',
          description_template: 'Pagamento Jantar de Gala de <Nome> - <Nmec>',
          contacts: [{ year: '2ª', name: 'Manager', phone: '912345678' }],
        },
        bus: { enabled: true, price_round_trip: 5, price_one_way: 3, capacity: 50 },
        meals: [{ id: 'meat', name: 'Carne', description: 'Bife', is_active: true, dish_type: 'NOR' }],
        allergies_required: false,
        payment_method: 'both',
        payment_deadline_date: '2030-01-01',
        payment_email: 'gala@example.test',
        homepage: {
          payment_info: { visible: true },
          bus_schedule: { buses: [] },
          dj: { visible: false },
          gallery: { visible: false },
          after_party: { visible: false },
          nominations_display: { visible: false, show_nominees: false },
        },
      },
    });
  });

  await page.route('**/api/gala/v1/registration/status', async (route) => {
    await route.fulfill({
      json: {
        _id: 1,
        nmec: 12345,
        name: 'Test User',
        email: 'user@ua.pt',
        registration_step: 4,
        is_registered: false,
        matriculation: 2,
        phone: '912345678',
        bus_option: 'NONE',
        meal_option: 'meat',
        food_allergies: '',
        companions: [],
        phased_payment: true,
        payment_proof_url: null,
        payment_proof_url_phase2: null,
        table_id: null,
      },
    });
  });

  await page.route('**/api/gala/v1/registration/step/4', async (route) => {
    const body = route.request().postDataJSON() as { phased_payment?: boolean };
    await route.fulfill({
      json: {
        _id: 1,
        nmec: 12345,
        name: 'Test User',
        email: 'user@ua.pt',
        registration_step: 4,
        is_registered: false,
        phased_payment: body.phased_payment ?? false,
      },
    });
  });
}

test.describe('Payment deadline flow', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
  });

  test('only allows full payment when phase 1 deadline has passed', async ({ page }) => {
    await mockPaymentDeadlineFlow(page);

    await page.goto('./register');

    await expect(page.getByRole('heading', { name: 'Pagamento' })).toBeVisible();
    await expect(page.getByText('Pagamento Total')).toBeVisible();
    await expect(page.getByText('Indisponível: o prazo da fase 1 já passou.')).toBeVisible();

    const phasedButton = page.getByRole('button', { name: /Pagamento em 2 Fases/i });
    await expect(phasedButton).toBeDisabled();
    await expect(page.getByText('Comprovativo de Pagamento')).toBeVisible();
    await expect(page.getByText('Fase 2')).not.toBeVisible();
    await expect(page.getByText('Deadline:').locator('..')).toContainText('1 de janeiro de 2030');
  });
});

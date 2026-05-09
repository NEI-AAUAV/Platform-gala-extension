import { Page } from '@playwright/test';

function base64url(obj: object): string {
  const json = JSON.stringify(obj);
  const bytes = Array.from(json).map((c) => c.codePointAt(0)!);
  const binary = String.fromCodePoint(...bytes);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function makeJwt(payload: object): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url(payload);
  return `${header}.${body}.fake-sig`;
}

const FAKE_USER_JWT = makeJwt({
  sub: 1,
  email: 'user@ua.pt',
  name: 'Test',
  surname: 'User',
  scopes: ['default'],
});

const FAKE_ADMIN_JWT = makeJwt({
  sub: 99,
  email: 'admin@ua.pt',
  name: 'Admin',
  surname: 'User',
  scopes: ['admin'],
});

const FAKE_MANAGER_JWT = makeJwt({
  sub: 42,
  email: 'manager@ua.pt',
  name: 'Manager',
  surname: 'Gala',
  scopes: ['manager-gala'],
});

export async function mockAuth(page: Page, role: 'user' | 'admin' | 'manager-gala') {
  const tokens: Record<typeof role, string> = {
    user: FAKE_USER_JWT,
    admin: FAKE_ADMIN_JWT,
    'manager-gala': FAKE_MANAGER_JWT,
  };
  await page.route('**/api/nei/v1/auth/refresh/', async (route) => {
    await route.fulfill({ json: { access_token: tokens[role] } });
  });
}

export async function mockManagerPermissions(
  page: Page,
  permissions: string[] = [],
  isAdmin: boolean = false,
) {
  await page.route('**/api/gala/v1/admin/managers/me', async (route) => {
    await route.fulfill({
      json: { is_admin: isAdmin, permissions },
    });
  });
}

export async function mockManagerList(page: Page, managers: object[] = []) {
  await page.route('**/api/gala/v1/admin/managers', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: managers });
    }
  });
}

export async function mockRegisteredUser(page: Page) {
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
        companions: [],
        bus_assignment: null,
        registration_step: 6,
        phone: null,
        is_registered: true,
        table_id: null,
      }
    });
  });
}

export async function mockUnregisteredUser(page: Page) {
  await page.route('**/api/gala/v1/user/me', async (route) => {
    await route.fulfill({ status: 404, json: { detail: 'Not registered' } });
  });
}

export async function mockGlobalConfig(page: Page) {
  await page.route('**/api/gala/v1/config', async (route) => {
    await route.fulfill({
      json: {
        _id: 'GLOBAL_CONFIG',
        event_name: 'Gala E2E',
        dates: {
          registration_start: '2020-01-01T00:00:00',
          registration_end: '2030-01-01T00:00:00',
          tables_start: '2020-01-01T00:00:00',
          tables_end: '2030-01-01T00:00:00',
          nominations_start: '2020-01-01T00:00:00',
          nominations_end: '2030-01-01T00:00:00',
          voting_start: '2020-01-01T00:00:00',
          voting_end: '2030-01-01T00:00:00',
        },
        prices: { total_price: 35, phased_payment_enabled: false },
        bus: { enabled: true, price_round_trip: 5, price_one_way: 3, capacity: 50 },
        meals: [
          { id: '1', name: 'Carne', description: 'Bife', is_active: true },
          { id: '2', name: 'Veg', description: 'Tofu', is_active: true }
        ],
        homepage: {
          payment_info: { visible: true },
          bus_schedule: { buses: [] },
          dj: { visible: true },
          gallery: { visible: true },
          after_party: { visible: true },
          nominations_display: { visible: true, show_nominees: true }
        }
      }
    });
  });
}

export async function mockTimeSlots(page: Page) {
  await page.route('**/api/gala/v1/time_slots/', async (route) => {
    await route.fulfill({
      json: {
        registrationStart: '2020-01-01T00:00:00',
        registrationEnd: '2030-01-01T00:00:00',
        votesStart: '2020-01-01T00:00:00',
        votesEnd: '2030-01-01T00:00:00',
        nominationsStart: '2020-01-01T00:00:00',
        nominationsEnd: '2030-01-01T00:00:00',
        tablesStart: '2020-01-01T00:00:00',
        tablesEnd: '2030-01-01T00:00:00',
        galaStart: '2030-12-31T00:00:00',
      }
    });
  });
}

export function createAuthState(_role: 'unauth' | 'user' | 'admin' | 'manager-gala', _isRegistered: boolean = false) {
  return { cookies: [], origins: [] };
}

export async function disableAnimations(page: Page) {
  await page.addInitScript(() => {
    const mql = (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
    Object.defineProperty(globalThis, 'matchMedia', { writable: true, value: mql });
  });
}

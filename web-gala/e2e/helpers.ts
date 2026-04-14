import { Page } from '@playwright/test';

export async function mockGlobalConfig(page: Page) {
  await page.route('**/api/gala/v1/config', async (route) => {
    await route.fulfill({
      json: {
        _id: "GLOBAL_CONFIG",
        event_name: "Gala E2E",
        dates: {
          registration_start: "2020-01-01T00:00:00",
          registration_end: "2030-01-01T00:00:00",
          tables_start: "2020-01-01T00:00:00",
          tables_end: "2030-01-01T00:00:00",
          nominations_start: "2020-01-01T00:00:00",
          nominations_end: "2030-01-01T00:00:00",
          voting_start: "2020-01-01T00:00:00",
          voting_end: "2030-01-01T00:00:00",
        },
        prices: { total_price: 35.0, phased_payment_enabled: false },
        bus: { enabled: true, price_round_trip: 5.0, price_one_way: 3.0, capacity: 50 },
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
        registrationStart: "2020-01-01T00:00:00",
        registrationEnd: "2030-01-01T00:00:00",
        votesStart: "2020-01-01T00:00:00",
        votesEnd: "2030-01-01T00:00:00",
        nominationsStart: "2020-01-01T00:00:00",
        nominationsEnd: "2030-01-01T00:00:00",
        tablesStart: "2020-01-01T00:00:00",
        tablesEnd: "2030-01-01T00:00:00",
        galaStart: "2030-12-31T00:00:00",
      }
    });
  });
}

export function createAuthState(role: 'unauth' | 'user' | 'admin' | 'manager-gala', isRegistered: boolean = false) {
  if (role === 'unauth') return { cookies: [], origins: [] };
  
  return {
    cookies: [],
    origins: [
      {
        origin: "http://localhost:5173",
        localStorage: [
          {
            name: "user-storage",
            value: JSON.stringify({
              state: {
                token: "fake-jwt-token-for-" + role,
                name: role === 'admin' ? 'Admin' : 'Test',
                surname: 'User',
                email: role + "@ua.pt",
                scopes: role === 'user' ? ["default"] : [role],
                id: 1,
                nmec: 12345,
                is_registered: isRegistered,
                sessionLoading: false
              },
              version: 0
            })
          }
        ]
      }
    ]
  };
}

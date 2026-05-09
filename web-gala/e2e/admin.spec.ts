import { test, expect } from '@playwright/test';
import {
  mockGlobalConfig,
  mockTimeSlots,
  mockAuth,
  mockRegisteredUser,
  mockManagerPermissions,
  mockManagerList,
  disableAnimations,
} from './helpers';

const ADMIN_MANAGERS = [
  { _id: 42, name: 'Manager Gala', email: 'manager@ua.pt', permissions: ['registration', 'tables'] },
];

async function mockCommonAdminRoutes(page: Parameters<typeof mockGlobalConfig>[0]) {
  await mockGlobalConfig(page);
  await mockTimeSlots(page);
  await page.route('**/api/gala/v1/admin/registrations', async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route('**/api/gala/v1/limits', async (route) => {
    await route.fulfill({ json: { maxRegistrations: 100, maxBusSeats: 50, maxTablesCount: 20 } });
  });
}

// Scoped to the sidebar nav and anchored to the start of button text to avoid
// matching buttons whose descriptions happen to contain the label word (e.g.
// "Inscritos" description contains "mesas e autocarros").
function navTab(page: Parameters<typeof mockGlobalConfig>[0], label: string) {
  return page.locator('nav').locator('button').filter({ hasText: new RegExp(`^${label}`) });
}

test.describe('Admin Panel as Admin', () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuth(page, 'admin');
    await mockRegisteredUser(page);
    await mockManagerPermissions(page, [], true);
    await mockManagerList(page, ADMIN_MANAGERS);
    await mockCommonAdminRoutes(page);
  });

  test('shows all tabs including Permissões', async ({ page }) => {
    await page.goto('./admin');

    await expect(navTab(page, 'Configurações')).toBeVisible();
    await expect(navTab(page, 'Inscritos')).toBeVisible();
    await expect(navTab(page, 'Mesas')).toBeVisible();
    await expect(navTab(page, 'Categorias')).toBeVisible();
    await expect(navTab(page, 'Resultados')).toBeVisible();
    await expect(navTab(page, 'Homepage')).toBeVisible();
    await expect(navTab(page, 'Permissões')).toBeVisible();
  });

  test('navigates between tabs', async ({ page }) => {
    await page.goto('./admin');

    await navTab(page, 'Categorias').click();
    await expect(page.locator('h1:has-text("Categorias de Votação")').first()).toBeVisible();

    await navTab(page, 'Homepage').click();
    await expect(page.locator('h1:has-text("Conteúdo da Homepage")').first()).toBeVisible();
  });

  test('Permissões tab lists managers with toggles', async ({ page }) => {
    await page.goto('./admin');

    await navTab(page, 'Permissões').click();
    await expect(page.locator('h1:has-text("Permissões de Managers")').first()).toBeVisible();
    await expect(page.locator('text=Manager Gala')).toBeVisible();
    await expect(page.locator('text=manager@ua.pt')).toBeVisible();
  });
});

test.describe('Admin Panel as Manager-Gala (registration + tables)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'manager-gala');
    await mockRegisteredUser(page);
    await mockManagerPermissions(page, ['registration', 'tables'], false);
    await mockCommonAdminRoutes(page);
  });

  test('shows only permitted tabs, no Permissões tab', async ({ page }) => {
    await page.goto('./admin');

    await expect(navTab(page, 'Configurações')).toBeVisible();
    await expect(navTab(page, 'Inscritos')).toBeVisible();
    await expect(navTab(page, 'Mesas')).toBeVisible();
    await expect(navTab(page, 'Categorias')).not.toBeVisible();
    await expect(navTab(page, 'Homepage')).not.toBeVisible();
    await expect(navTab(page, 'Permissões')).not.toBeVisible();
  });

  test('lands on first permitted tab', async ({ page }) => {
    await page.goto('./admin');
    await expect(page.locator('h1:has-text("Configurações do Jantar")').first()).toBeVisible();
  });
});

test.describe('Admin Panel as Manager-Gala (no permissions)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'manager-gala');
    await mockRegisteredUser(page);
    await mockManagerPermissions(page, [], false);
  });

  test('shows sem permissões message', async ({ page }) => {
    await page.goto('./admin');
    await expect(page.locator('text=Sem permissões de acesso ao painel de administração')).toBeVisible();
  });
});

test.describe('Admin Panel as Manager-Gala (categories only)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'manager-gala');
    await mockRegisteredUser(page);
    await mockManagerPermissions(page, ['categories'], false);
    await page.route('**/api/gala/v1/voting/categories', async (route) => {
      await route.fulfill({ json: [] });
    });
  });

  test('shows only Categorias and Resultados tabs', async ({ page }) => {
    await page.goto('./admin');

    await expect(navTab(page, 'Categorias')).toBeVisible();
    await expect(navTab(page, 'Resultados')).toBeVisible();
    await expect(navTab(page, 'Configurações')).not.toBeVisible();
    await expect(navTab(page, 'Inscritos')).not.toBeVisible();
    await expect(navTab(page, 'Mesas')).not.toBeVisible();
  });
});

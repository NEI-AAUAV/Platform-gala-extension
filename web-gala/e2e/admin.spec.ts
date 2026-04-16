import { test, expect } from '@playwright/test';
import {
  mockGlobalConfig,
  mockTimeSlots,
  mockAuth,
  mockSessionUser,
  mockManagerPermissions,
  mockManagerList,
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

test.describe('Admin Panel as Admin', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'admin');
    await mockSessionUser(page, true);
    await mockManagerPermissions(page, [], true);
    await mockManagerList(page, ADMIN_MANAGERS);
    await mockCommonAdminRoutes(page);
  });

  test('shows all tabs including Permissões', async ({ page }) => {
    await page.goto('./admin');

    await expect(page.locator('button:has-text("Inscrições")')).toBeVisible();
    await expect(page.locator('button:has-text("Mesas")')).toBeVisible();
    await expect(page.locator('button:has-text("Categorias")')).toBeVisible();
    await expect(page.locator('button:has-text("Resultados")')).toBeVisible();
    await expect(page.locator('button:has-text("Homepage")')).toBeVisible();
    await expect(page.locator('button:has-text("Autocarros")')).toBeVisible();
    await expect(page.locator('button:has-text("Permissões")')).toBeVisible();
  });

  test('navigates between tabs', async ({ page }) => {
    await page.goto('./admin');

    await page.click('button:has-text("Categorias")');
    await expect(page.locator('text=Gestão de Categorias')).toBeVisible();

    await page.click('button:has-text("Homepage")');
    await expect(page.locator('text=Conteúdo da Homepage')).toBeVisible();
  });

  test('Permissões tab lists managers with toggles', async ({ page }) => {
    await page.goto('./admin');

    await page.click('button:has-text("Permissões")');
    await expect(page.locator('text=Permissões de Managers')).toBeVisible();
    await expect(page.locator('text=Manager Gala')).toBeVisible();
    await expect(page.locator('text=manager@ua.pt')).toBeVisible();
  });
});

test.describe('Admin Panel as Manager-Gala (registration + tables)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'manager-gala');
    await mockSessionUser(page, true);
    await mockManagerPermissions(page, ['registration', 'tables'], false);
    await mockCommonAdminRoutes(page);
  });

  test('shows only permitted tabs, no Permissões tab', async ({ page }) => {
    await page.goto('./admin');

    await expect(page.locator('button:has-text("Inscrições")')).toBeVisible();
    await expect(page.locator('button:has-text("Mesas")')).toBeVisible();
    await expect(page.locator('button:has-text("Categorias")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Homepage")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Autocarros")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Permissões")')).not.toBeVisible();
  });

  test('lands on first permitted tab', async ({ page }) => {
    await page.goto('./admin');
    await expect(page.locator('text=Configuração das Inscrições')).toBeVisible();
  });
});

test.describe('Admin Panel as Manager-Gala (no permissions)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'manager-gala');
    await mockSessionUser(page, true);
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
    await mockSessionUser(page, true);
    await mockManagerPermissions(page, ['categories'], false);
    await page.route('**/api/gala/v1/voting/categories', async (route) => {
      await route.fulfill({ json: [] });
    });
  });

  test('shows only Categorias and Resultados tabs', async ({ page }) => {
    await page.goto('./admin');

    await expect(page.locator('button:has-text("Categorias")')).toBeVisible();
    await expect(page.locator('button:has-text("Resultados")')).toBeVisible();
    await expect(page.locator('button:has-text("Inscrições")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Mesas")')).not.toBeVisible();
  });
});
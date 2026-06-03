import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, mockAuth, mockRegisteredUser, mockUnregisteredUser } from './helpers';

test.describe('Nomination System', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'user');
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
  });

  test('should restrict access to unregistered users', async ({ page }) => {
    await mockUnregisteredUser(page);

    await page.goto('./nominate');

    await expect(
      page.locator('text=Tens de estar inscrito na Gala para participar nas nomeações.')
    ).toBeVisible();
  });

  test('should display message when no categories are open', async ({ page }) => {
    await mockRegisteredUser(page);

    // Mock categories with none open for nominations
    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            category: 'Best Student',
            options: [],
            photo_paths: [],
            scores: [],
            already_voted: null,
            nomination_open: false, // closed
            voting_open: false,
            already_nominated: false,
            revealed: true,
            min_nominees: 1,
            max_nominees: 3,
          }
        ]
      });
    });

    await page.goto('./nominate');

    await expect(
      page.locator('text=Não há categorias de nomeação abertas.')
    ).toBeVisible();
  });

  test('should show guide modal on first visit and save seen state', async ({ page }) => {
    await mockRegisteredUser(page);

    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            category: 'Best Student',
            options: [],
            photo_paths: [],
            scores: [],
            already_voted: null,
            nomination_open: true,
            voting_open: false,
            already_nominated: false,
            revealed: true,
            min_nominees: 1,
            max_nominees: 3,
          }
        ]
      });
    });

    await page.goto('./nominate');

    // Guide modal should open automatically
    await expect(page.locator('text=Guia de Nomeações')).toBeVisible();

    // Click the close/confirm guide button
    const closeBtn = page.getByRole('button', { name: /Entendido/i }).or(page.locator('button', { hasText: 'Fechar' })).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      // Fallback click on modal close button or backdrop
      await page.locator('text=Guia de Nomeações').locator('xpath=..').locator('button').first().click();
    }

    await expect(page.locator('text=Guia de Nomeações')).not.toBeVisible();

    // Verify local storage has been updated
    const isSeen = await page.evaluate(() => localStorage.getItem('gala_nomination_guide_seen'));
    expect(isSeen).toBe('true');
  });

  test('should allow typing a nominee, selecting a suggestion, and submitting successfully', async ({ page }) => {
    await mockRegisteredUser(page);

    // Set localStorage so guide doesn't pop up
    await page.addInitScript(() => {
      localStorage.setItem('gala_nomination_guide_seen', 'true');
    });

    // Mock open nomination category
    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            category: 'Best Student',
            options: [],
            photo_paths: [],
            scores: [],
            already_voted: null,
            nomination_open: true,
            voting_open: false,
            already_nominated: false,
            revealed: true,
            min_nominees: 1,
            max_nominees: 3,
          }
        ]
      });
    });

    // Mock suggestion endpoint
    await page.route('**/api/gala/v1/voting/nominees/suggest*', async route => {
      await route.fulfill({
        json: ['John Doe', 'Johnny Bravo']
      });
    });

    // Mock bulk nominate submission
    await page.route('**/api/gala/v1/voting/bulk_nominate', async route => {
      await route.fulfill({
        json: { status: 'success' }
      });
    });

    await page.goto('./nominate');

    await expect(page.locator('text=Best Student')).toBeVisible();

    const input = page.locator('#nomination-input-1');
    await expect(input).toBeVisible();

    // Type nominee name
    await input.fill('John');

    // Suggestion dropdown should appear
    const suggestionItem = page.locator('text=John Doe');
    await expect(suggestionItem).toBeVisible();
    await suggestionItem.click();

    // The nominee tag "John Doe" should now be visible on the card
    await expect(page.locator('span', { hasText: 'John Doe' }).first()).toBeVisible();

    // Submit button should be visible and clickable
    const submitBtn = page.getByRole('button', { name: /Submeter Todas as Nomeações/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Should show success notification/toast
    await expect(page.locator('text=Todas as nomeações foram submetidas com sucesso!')).toBeVisible();
  });

  test('should display already nominated view and allow editing it', async ({ page }) => {
    await mockRegisteredUser(page);

    // Set localStorage so guide doesn't pop up
    await page.addInitScript(() => {
      localStorage.setItem('gala_nomination_guide_seen', 'true');
      localStorage.setItem('gala_nomination_1', 'Alice & Bob');
    });

    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            category: 'Best Student',
            options: [],
            photo_paths: [],
            scores: [],
            already_voted: null,
            nomination_open: true,
            voting_open: false,
            already_nominated: true, // already nominated!
            revealed: true,
            min_nominees: 1,
            max_nominees: 3,
          }
        ]
      });
    });

    await page.route('**/api/gala/v1/voting/nominees/suggest*', async route => {
      await route.fulfill({
        json: ['John Doe']
      });
    });

    await page.route('**/api/gala/v1/voting/bulk_nominate', async route => {
      await route.fulfill({
        json: { status: 'success' }
      });
    });

    await page.goto('./nominate');

    // Should display the already nominated name
    await expect(page.locator('text=Alice & Bob')).toBeVisible();

    // Clicking edit pencil button
    const editBtn = page.locator('button[title="Alterar nomeação"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // The nomination input should be visible again
    const input = page.locator('#nomination-input-1');
    await expect(input).toBeVisible();

    // Enter a new name
    await input.fill('John');
    const suggestionItem = page.locator('text=John Doe');
    await expect(suggestionItem).toBeVisible();
    await suggestionItem.click();

    // Click submit
    const submitBtn = page.getByRole('button', { name: /Submeter Todas as Nomeações/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    await expect(page.locator('text=Todas as nomeações foram submetidas com sucesso!')).toBeVisible();
  });
});

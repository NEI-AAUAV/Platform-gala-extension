import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, mockAuth, mockRegisteredUser } from './helpers';

test.describe('Voting System', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'user');
    await mockRegisteredUser(page);
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
  });

  test('should display voting categories and submit a vote', async ({ page }) => {
    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            category: 'Best Student',
            options: ['Alice', 'Bob', 'Charlie'],
            photo_paths: ['https://placehold.co/32', 'https://placehold.co/32', 'https://placehold.co/32'],
            scores: [0, 0, 0],
            already_voted: null,
            nomination_open: false,
            voting_open: true,
            already_nominated: false,
            revealed: true,
          }
        ]
      });
    });

    await page.route('**/api/gala/v1/voting/categories/1/vote', async route => {
      await route.fulfill({ json: { status: 'success' } });
    });

    await page.goto('./vote');

    await expect(page.locator('text=Votações').first()).toBeVisible();
    await expect(page.locator('text=Best Student')).toBeVisible();

    // Target the button element so we can assert its selected state after clicking
    const aliceOption = page.locator('button', { has: page.getByText('Alice', { exact: true }) });
    await expect(aliceOption).toBeVisible();
    await aliceOption.click();

    const submitBtn = page.getByRole('button', { name: /Enviar votações/i });
    // Register the response listener before clicking to avoid a race condition
    const voteRequest = page.waitForResponse('**/api/gala/v1/voting/categories/1/vote');
    await submitBtn.click();
    await voteRequest;

    await expect(page.getByRole('heading', { name: 'Sucesso!' })).toBeVisible();
  });

  test('should handle already voted category properly', async ({ page }) => {
    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            category: 'Best Student',
            options: ['Alice', 'Bob', 'Charlie'],
            photo_paths: ['https://placehold.co/32', 'https://placehold.co/32', 'https://placehold.co/32'],
            scores: [0, 0, 0],
            already_voted: 1, // Bob (index 1)
            nomination_open: false,
            voting_open: true,
            already_nominated: false,
            revealed: true,
          }
        ]
      });
    });

    await page.goto('./vote');

    // Should display the "Votado" status badge on the card
    await expect(page.locator('text=Votado').first()).toBeVisible();

    // The option that was already voted (Bob) should be disabled
    const bobOption = page.locator('button', { has: page.getByText('Bob', { exact: true }) });
    await expect(bobOption).toBeDisabled();

    // Other options (e.g. Alice) should also be disabled since the category is already voted
    const aliceOption = page.locator('button', { has: page.getByText('Alice', { exact: true }) });
    await expect(aliceOption).toBeDisabled();

    // The global submit button should say "Votações Concluídas" and be disabled
    const submitBtn = page.getByRole('button', { name: /Votações Concluídas/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();
  });

  test('should display multiple categories in mixed states (voted, closed, open)', async ({ page }) => {
    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            category: 'Best Student',
            options: ['Alice', 'Bob'],
            photo_paths: ['https://placehold.co/32', 'https://placehold.co/32'],
            scores: [0, 0],
            already_voted: null,
            nomination_open: false,
            voting_open: true, // open category
            already_nominated: false,
            revealed: true,
          },
          {
            _id: 2,
            category: 'Best Professor',
            options: ['David', 'Eva'],
            photo_paths: ['https://placehold.co/32', 'https://placehold.co/32'],
            scores: [0, 0],
            already_voted: null,
            nomination_open: false,
            voting_open: false, // closed category
            already_nominated: false,
            revealed: true,
          }
        ]
      });
    });

    await page.route('**/api/gala/v1/voting/categories/1/vote', async route => {
      await route.fulfill({ json: { status: 'success' } });
    });

    await page.goto('./vote');

    // "Best Student" options should be enabled
    const aliceOption = page.locator('button', { has: page.getByText('Alice', { exact: true }) });
    await expect(aliceOption).toBeEnabled();

    // "Best Professor" options should be disabled and show "Votações Abrem Brevemente"
    const davidOption = page.locator('button', { has: page.getByText('David', { exact: true }) });
    await expect(davidOption).toBeDisabled();
    await expect(page.locator('text=Votações Abrem Brevemente')).toBeVisible();

    // We should still be able to vote for "Best Student" and submit it successfully
    await aliceOption.click();
    const submitBtn = page.getByRole('button', { name: /Enviar votações/i });
    const voteRequest = page.waitForResponse('**/api/gala/v1/voting/categories/1/vote');
    await submitBtn.click();
    await voteRequest;

    await expect(page.getByRole('heading', { name: 'Sucesso!' })).toBeVisible();
  });

  test('should handle API errors and show toast/modal message', async ({ page }) => {
    await page.route('**/api/gala/v1/voting/categories', async route => {
      await route.fulfill({
        json: [
          {
            _id: 1,
            category: 'Best Student',
            options: ['Alice', 'Bob', 'Charlie'],
            photo_paths: ['https://placehold.co/32', 'https://placehold.co/32', 'https://placehold.co/32'],
            scores: [0, 0, 0],
            already_voted: null,
            nomination_open: false,
            voting_open: true,
            already_nominated: false,
            revealed: true,
          }
        ]
      });
    });

    // Mock API error response for casting vote
    await page.route('**/api/gala/v1/voting/categories/1/vote', async route => {
      await route.fulfill({
        status: 409,
        json: { detail: 'Já votaste nesta categoria.' }
      });
    });

    await page.goto('./vote');

    const aliceOption = page.locator('button', { has: page.getByText('Alice', { exact: true }) });
    await expect(aliceOption).toBeVisible();
    await aliceOption.click();

    const submitBtn = page.getByRole('button', { name: /Enviar votações/i });
    await submitBtn.click();

    // Verify error modal/message is shown
    await expect(page.getByRole('heading', { name: 'Erro' })).toBeVisible();
    await expect(page.locator('text=Já votaste nesta categoria.')).toBeVisible();
  });
});


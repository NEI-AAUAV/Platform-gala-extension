import { test, expect } from '@playwright/test';
import { mockGlobalConfig, mockTimeSlots, mockAuth, mockRegisteredUser } from './helpers';

test.describe('Voting System', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, 'user');
    await mockRegisteredUser(page);
    await mockGlobalConfig(page);
    await mockTimeSlots(page);

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
          }
        ]
      });
    });

    await page.route('**/api/gala/v1/voting/categories/1/vote', async route => {
      await route.fulfill({ json: { status: 'success' } });
    });
  });

  test('should display voting categories and submit a vote', async ({ page }) => {
    await page.goto('./vote');

    await expect(page.locator('text=Votações').first()).toBeVisible();
    await expect(page.locator('text=Best Student')).toBeVisible();

    // Target the button element so we can assert its selected state after clicking
    const aliceOption = page.locator('button', { has: page.getByText('Alice', { exact: true }) });
    await expect(aliceOption).toBeVisible();
    await aliceOption.click();
    // Confirm Alice is selected: the default border-dark-gold class is replaced
    await expect(aliceOption).not.toHaveClass(/border-dark-gold/);

    const submitBtn = page.getByRole('button', { name: /Enviar votações/i });
    // Register the response listener before clicking to avoid a race condition
    const voteRequest = page.waitForResponse('**/api/gala/v1/voting/categories/1/vote');
    await submitBtn.click();
    await voteRequest;

    await expect(page.getByRole('heading', { name: 'Sucesso!' })).toBeVisible();
  });
});

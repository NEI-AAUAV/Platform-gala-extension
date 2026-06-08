import { test, expect, Page } from "@playwright/test";
import {
  mockGlobalConfig,
  mockTimeSlots,
  mockAuth,
  mockRegisteredUser,
} from "./helpers";

const imageUrl = "https://placehold.co/32";

type VoteCategory = {
  _id: number;
  category: string;
  options: string[];
  photo_paths: string[];
  scores: number[];
  already_voted: number | null;
  nomination_open: boolean;
  voting_open: boolean;
  already_nominated: boolean;
  revealed: boolean;
};

function voteCategory(overrides: Partial<VoteCategory> = {}): VoteCategory {
  const options = overrides.options ?? ["Alice", "Bob", "Charlie"];

  return {
    _id: 1,
    category: "Best Student",
    options,
    photo_paths: options.map(() => imageUrl),
    scores: options.map(() => 0),
    already_voted: null,
    nomination_open: false,
    voting_open: true,
    already_nominated: false,
    revealed: true,
    ...overrides,
  };
}

async function mockVoteCategories(page: Page, categories: VoteCategory[]) {
  await page.route("**/api/gala/v1/voting/categories", async (route) => {
    await route.fulfill({ json: categories });
  });
}

async function mockSuccessfulVote(page: Page, categoryId = 1) {
  await page.route(
    `**/api/gala/v1/voting/categories/${categoryId}/vote`,
    async (route) => {
      await route.fulfill({ json: { status: "success" } });
    },
  );
}

test.describe("Voting System", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("gala_voting_guide_seen", "true");
    });
    await mockAuth(page, "user");
    await mockRegisteredUser(page);
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
  });

  test("should display voting categories and submit a vote", async ({
    page,
  }) => {
    await mockVoteCategories(page, [voteCategory()]);
    await mockSuccessfulVote(page);

    await page.goto("./vote");

    await expect(page.locator("text=Votações").first()).toBeVisible();
    await expect(page.locator("text=Best Student")).toBeVisible();

    const aliceOption = page.locator("button", {
      has: page.getByText("Alice", { exact: true }),
    });
    await expect(aliceOption).toBeVisible();
    await aliceOption.click();

    const submitBtn = page.getByRole("button", { name: /Enviar votações/i });
    await submitBtn.click();

    await expect(page.getByRole("heading", { name: "Sucesso!" })).toBeVisible();
  });

  test("should handle already voted category properly", async ({ page }) => {
    await mockVoteCategories(page, [voteCategory({ already_voted: 1 })]);

    await page.goto("./vote");

    await expect(page.locator("text=Votado").first()).toBeVisible();

    const bobOption = page.locator("button", {
      has: page.getByText("Bob", { exact: true }),
    });
    await expect(bobOption).toBeDisabled();

    const aliceOption = page.locator("button", {
      has: page.getByText("Alice", { exact: true }),
    });
    await expect(aliceOption).toBeDisabled();

    const submitBtn = page.getByRole("button", {
      name: /Votações Concluídas/i,
    });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();
  });

  test("should display multiple categories in mixed states (voted, closed, open)", async ({
    page,
  }) => {
    await mockVoteCategories(page, [
      voteCategory({ options: ["Alice", "Bob"] }),
      voteCategory({
        _id: 2,
        category: "Best Professor",
        options: ["David", "Eva"],
        voting_open: false,
      }),
    ]);
    await mockSuccessfulVote(page);

    await page.goto("./vote");

    const aliceOption = page.locator("button", {
      has: page.getByText("Alice", { exact: true }),
    });
    await expect(aliceOption).toBeEnabled();

    const davidOption = page.locator("button", {
      has: page.getByText("David", { exact: true }),
    });
    await expect(davidOption).toBeDisabled();
    await expect(page.locator("text=Votações Abrem Brevemente")).toBeVisible();

    await aliceOption.click();
    const submitBtn = page.getByRole("button", { name: /Enviar votações/i });
    await submitBtn.click();

    await expect(page.getByRole("heading", { name: "Sucesso!" })).toBeVisible();
  });

  test("should handle API errors and show toast/modal message", async ({
    page,
  }) => {
    await mockVoteCategories(page, [voteCategory()]);

    await page.route(
      "**/api/gala/v1/voting/categories/1/vote",
      async (route) => {
        await route.fulfill({
          status: 409,
          json: { detail: "Já votaste nesta categoria." },
        });
      },
    );

    await page.goto("./vote");

    const aliceOption = page.locator("button", {
      has: page.getByText("Alice", { exact: true }),
    });
    await expect(aliceOption).toBeVisible();
    await aliceOption.click();

    const submitBtn = page.getByRole("button", { name: /Enviar votações/i });
    await submitBtn.click();

    await expect(page.getByRole("heading", { name: "Incompleto" })).toBeVisible();
    await expect(
      page.locator("text=Já votaste nesta categoria."),
    ).toBeVisible();
  });
});

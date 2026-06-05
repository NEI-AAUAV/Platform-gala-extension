import { test, expect } from "@playwright/test";
import {
  mockGlobalConfig,
  mockTimeSlots,
  mockAuth,
  mockRegisteredUser,
  mockManagerPermissions,
  mockManagerList,
  disableAnimations,
} from "./helpers";

const ADMIN_MANAGERS = [
  {
    _id: 42,
    name: "Manager Gala",
    email: "manager@ua.pt",
    permissions: ["registration", "tables"],
  },
];

function voteCategory(overrides: Record<string, unknown> = {}) {
  return {
    _id: 1,
    category: "Melhor Momento",
    description: "Categoria de teste",
    min_nominees: 1,
    max_nominees: 1,
    nominations: [],
    options: [],
    photo_paths: [],
    votes: [],
    reveal_at: null,
    is_hidden: false,
    ...overrides,
  };
}

async function mockCommonAdminRoutes(
  page: Parameters<typeof mockGlobalConfig>[0],
) {
  await mockGlobalConfig(page);
  await mockTimeSlots(page);
  await page.route("**/api/gala/v1/admin/registrations", async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route("**/api/gala/v1/limits", async (route) => {
    await route.fulfill({
      json: { maxRegistrations: 100, maxBusSeats: 50, maxTablesCount: 20 },
    });
  });
}

// Scoped to the sidebar nav and anchored to the start of button text to avoid
// matching buttons whose descriptions happen to contain the label word (e.g.
// "Inscritos" description contains "mesas e autocarros").
function navTab(page: Parameters<typeof mockGlobalConfig>[0], label: string) {
  return page
    .locator("nav")
    .locator("button")
    .filter({ hasText: new RegExp(`^${label}`) });
}

test.describe("Admin Panel as Admin", () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuth(page, "admin");
    await mockRegisteredUser(page);
    await mockManagerPermissions(page, [], true);
    await mockManagerList(page, ADMIN_MANAGERS);
    await mockCommonAdminRoutes(page);
  });

  test("shows all tabs including Permissões", async ({ page }) => {
    await page.goto("./admin");

    await expect(navTab(page, "Configurações")).toBeVisible();
    await expect(navTab(page, "Inscritos")).toBeVisible();
    await expect(navTab(page, "Mesas")).toBeVisible();
    await expect(navTab(page, "Votação")).toBeVisible();
    await expect(navTab(page, "Homepage")).toBeVisible();
    await expect(navTab(page, "Permissões")).toBeVisible();
  });

  test("navigates between tabs", async ({ page }) => {
    await page.goto("./admin");

    await navTab(page, "Votação").click();
    await expect(
      page.locator('h1:has-text("Votação da Gala")').first(),
    ).toBeVisible();

    await navTab(page, "Homepage").click();
    await expect(
      page.locator('h1:has-text("Conteúdo da Homepage")').first(),
    ).toBeVisible();
  });

  test("Permissões tab lists managers with toggles", async ({ page }) => {
    await page.goto("./admin");

    await navTab(page, "Permissões").click();
    await expect(
      page.locator('h1:has-text("Permissões de Managers")').first(),
    ).toBeVisible();
    await expect(page.locator("text=Manager Gala")).toBeVisible();
    await expect(page.locator("text=manager@ua.pt")).toBeVisible();
  });
});

test.describe("Admin Panel as Manager-Gala (registration + tables)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, "manager-gala");
    await mockRegisteredUser(page);
    await mockManagerPermissions(page, ["registration", "tables"], false);
    await mockCommonAdminRoutes(page);
  });

  test("shows only permitted tabs, no Permissões tab", async ({ page }) => {
    await page.goto("./admin");

    await expect(navTab(page, "Configurações")).toBeVisible();
    await expect(navTab(page, "Inscritos")).toBeVisible();
    await expect(navTab(page, "Mesas")).toBeVisible();
    await expect(navTab(page, "Votação")).not.toBeVisible();
    await expect(navTab(page, "Homepage")).not.toBeVisible();
    await expect(navTab(page, "Permissões")).not.toBeVisible();
  });

  test("lands on first permitted tab", async ({ page }) => {
    await page.goto("./admin");
    await expect(
      page.locator('h1:has-text("Configurações do Jantar")').first(),
    ).toBeVisible();
  });
});

test.describe("Admin Panel as Manager-Gala (no permissions)", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, "manager-gala");
    await mockRegisteredUser(page);
    await mockManagerPermissions(page, [], false);
  });

  test("shows sem permissões message", async ({ page }) => {
    await page.goto("./admin");
    await expect(
      page.locator("text=Sem permissões de acesso ao painel de administração"),
    ).toBeVisible();
  });
});

test.describe("Admin Panel as Manager-Gala (categories only)", () => {
  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await mockAuth(page, "manager-gala");
    await mockRegisteredUser(page);
    await mockManagerPermissions(page, ["categories"], false);
    await mockGlobalConfig(page);
    await mockTimeSlots(page);
    await page.route("**/api/gala/v1/voting/categories", async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route(
      "**/api/gala/v1/admin/voting/categories",
      async (route) => {
        await route.fulfill({ json: [] });
      },
    );
  });

  test("shows only Votação tab", async ({ page }) => {
    await page.goto("./admin");

    await expect(navTab(page, "Votação")).toBeVisible();
    await expect(navTab(page, "Configurações")).not.toBeVisible();
    await expect(navTab(page, "Inscritos")).not.toBeVisible();
    await expect(navTab(page, "Mesas")).not.toBeVisible();
  });

  test("creates a nomination runoff for nominees tied at the Top 4 cutoff", async ({
    page,
  }) => {
    let requestedRunoff: unknown = null;
    await page.route(
      "**/api/gala/v1/admin/voting/categories",
      async (route) => {
        await route.fulfill({
          json: [
            voteCategory({
              nominations: [
                { name: "Alice", votes: [1, 2, 3] },
                { name: "Bob", votes: [4, 5, 6] },
                { name: "Carol", votes: [7, 8] },
                { name: "Dave", votes: [9, 10] },
                { name: "Eve", votes: [11, 12] },
              ],
            }),
          ],
        });
      },
    );
    await page.route(
      "**/api/gala/v1/admin/voting/categories/1/runoff",
      async (route) => {
        requestedRunoff = route.request().postDataJSON();
        await route.fulfill({
          json: voteCategory({
            _id: 2,
            category: "Desempate - Melhor Momento",
            options: ["Carol", "Dave", "Eve"],
          }),
        });
      },
    );

    await page.goto("./admin");
    await page.getByRole("button", { name: /Nomeações/ }).click();
    await expect(
      page.getByText("Há 3 nomeados empatados para 2 lugares no Top 4."),
    ).toBeVisible();
    await page.getByLabel("Início da 2.ª volta").fill("2026-06-10T12:00");
    await page.getByLabel("Fim da 2.ª volta").fill("2026-06-11T12:00");
    await page.getByRole("button", { name: "Criar 2.ª volta entre 3" }).click();

    await expect.poll(() => requestedRunoff).toEqual(
      expect.objectContaining({
        nominee_names: ["Carol", "Dave", "Eve"],
        slots: 2,
        votes_start: expect.any(String),
        votes_end: expect.any(String),
      }),
    );
    await expect(
      page.getByText("2.ª volta criada com os nomeados empatados."),
    ).toBeVisible();
  });

  test("finalizes nominations with an explicit admin selection", async ({
    page,
  }) => {
    let requestedFinalize: unknown = null;
    await page.route(
      "**/api/gala/v1/admin/voting/categories",
      async (route) => {
        await route.fulfill({
          json: [
            voteCategory({
              nominations: [
                { name: "Alice", votes: [1, 2] },
                { name: "Bob", votes: [3, 4] },
                { name: "Carol", votes: [5, 6] },
              ],
            }),
          ],
        });
      },
    );
    await page.route(
      "**/api/gala/v1/admin/voting/categories/1/finalize",
      async (route) => {
        requestedFinalize = route.request().postDataJSON();
        await route.fulfill({ json: { status: "success" } });
      },
    );

    await page.goto("./admin");
    await page.getByRole("button", { name: /Nomeações/ }).click();
    await page
      .locator("label")
      .filter({ hasText: "Alice" })
      .getByRole("checkbox")
      .check();
    await page
      .locator("label")
      .filter({ hasText: "Carol" })
      .getByRole("checkbox")
      .check();
    await page
      .getByRole("button", { name: "Finalizar com 2 selecionados" })
      .click();
    await page.getByRole("button", { name: "Confirmar" }).click();

    await expect
      .poll(() => requestedFinalize)
      .toEqual({ selected_names: ["Alice", "Carol"] });
    await expect(
      page.getByText("Nomeações finalizadas com a seleção indicada."),
    ).toBeVisible();
  });

  test("creates a final vote runoff for options tied in first place", async ({
    page,
  }) => {
    let requestedVoteRunoff: unknown = null;
    await page.route(
      "**/api/gala/v1/admin/voting/categories",
      async (route) => {
        await route.fulfill({
          json: [
            voteCategory({
              options: ["Alice", "Bob", "Carol"],
              votes: [
                { uid: 1, option: 0 },
                { uid: 2, option: 0 },
                { uid: 3, option: 1 },
                { uid: 4, option: 1 },
                { uid: 5, option: 2 },
              ],
            }),
          ],
        });
      },
    );
    await page.route(
      "**/api/gala/v1/admin/voting/categories/1/vote-runoff",
      async (route) => {
        requestedVoteRunoff = route.request().postDataJSON();
        await route.fulfill({
          json: voteCategory({
            _id: 3,
            category: "Desempate - Melhor Momento",
            options: ["Alice", "Bob"],
          }),
        });
      },
    );

    await page.goto("./admin");
    await expect(
      page.getByText("Há 2 opções empatadas em 1.º lugar com 2 votos."),
    ).toBeVisible();
    await expect(page.getByText("Alice").nth(1)).toBeVisible();
    await expect(page.getByText("Bob").nth(1)).toBeVisible();
    await page.getByLabel("Início do desempate").fill("2026-06-12T12:00");
    await page.getByLabel("Fim do desempate").fill("2026-06-13T12:00");
    await page.getByRole("button", { name: "Criar desempate entre 2" }).click();

    await expect.poll(() => requestedVoteRunoff).toEqual(
      expect.objectContaining({
        votes_start: expect.any(String),
        votes_end: expect.any(String),
      }),
    );
    await expect(
      page.getByText("2.ª volta criada para desempatar o vencedor."),
    ).toBeVisible();
  });

  test("does not show final vote runoff action when there is a clear winner", async ({
    page,
  }) => {
    await page.route(
      "**/api/gala/v1/admin/voting/categories",
      async (route) => {
        await route.fulfill({
          json: [
            voteCategory({
              options: ["Alice", "Bob"],
              votes: [
                { uid: 1, option: 0 },
                { uid: 2, option: 0 },
                { uid: 3, option: 1 },
              ],
            }),
          ],
        });
      },
    );

    await page.goto("./admin");
    await expect(
      page.getByRole("button", { name: /Criar desempate/ }),
    ).not.toBeVisible();
    await expect(
      page.getByText(/opções empatadas em 1.º lugar/),
    ).not.toBeVisible();
  });
});

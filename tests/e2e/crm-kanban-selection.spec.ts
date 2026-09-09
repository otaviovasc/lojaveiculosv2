import { expect, test } from "@playwright/test";
import { installOperationalCrm } from "./crm-operational-fixtures";
import { expectAccessible, expectViewportSafe } from "./support/uiQuality";
import { saveQaScreenshot } from "./support/artifacts";

const sellerId = "70000000-0000-4000-8000-000000000099";
const listingId = "71000000-0000-4000-8000-000000000099";

test("seller, origin and vehicle filters reach the server and can be cleared", async ({
  page,
}, testInfo) => {
  const { boardQueries } = await installOperationalCrm(page);
  await page.route("**/api/v1/identity/member-options", (route) =>
    route.fulfill({
      json: {
        members: [
          {
            userId: sellerId,
            name: "Bia Vendedora",
            email: "bia@example.com",
            role: "seller",
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/inventory/units?**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            listing: {
              id: listingId,
              title: "Honda Civic",
              status: "available",
              priceCents: 9000000,
            },
            primaryUnit: null,
            primaryMediaUrl: null,
          },
        ],
        total: 1,
        nextCursor: null,
      },
    }),
  );
  await page.goto("/crm#/crm?surface=leads");
  await expect(
    page.getByRole("heading", { name: "ANA NASCIMENTO", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Filtrar por responsável", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Buscar responsável" }).fill("Bia");
  await page
    .getByRole("button", { name: "Bia Vendedora", exact: true })
    .click();
  await expect.poll(() => boardQueries.at(-1)?.get("assignee")).toBe(sellerId);
  await page.getByRole("button", { name: "Origem", exact: true }).click();
  await page.getByRole("checkbox", { name: "Instagram", exact: true }).click();
  await expect
    .poll(() => boardQueries.at(-1)?.get("sources"))
    .toBe("instagram");
  await page.getByRole("button", { name: "Origem", exact: true }).click();
  await page
    .getByRole("button", { name: "Filtrar por veículo", exact: true })
    .click();
  await page.getByRole("button", { name: /Honda Civic/ }).click();
  await expect
    .poll(() => boardQueries.at(-1)?.get("listingId"))
    .toBe(listingId);
  expect(boardQueries.at(-1)?.get("assignee")).toBe(sellerId);
  expect(boardQueries.at(-1)?.get("sources")).toBe("instagram");
  // Server results are authoritative even when the card's primary vehicle or owner differs.
  await expect(
    page.getByRole("heading", { name: "ANA NASCIMENTO", exact: true }),
  ).toBeVisible();
  await expectAccessible(page);
  await expectViewportSafe(page);
  await saveQaScreenshot(page, testInfo, "kanban-selection-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await expectViewportSafe(page);
  await saveQaScreenshot(page, testInfo, "kanban-selection-mobile");
  await page
    .getByRole("button", { name: "Limpar filtro de responsável", exact: true })
    .click();
  await expect.poll(() => boardQueries.at(-1)?.get("assignee")).toBeNull();
  await page
    .getByRole("button", { name: "Limpar filtro de veículo", exact: true })
    .click();
  await expect.poll(() => boardQueries.at(-1)?.get("listingId")).toBeNull();
  await page
    .getByRole("button", { name: "Filtrar por responsável", exact: true })
    .click();
  await page.getByRole("button", { name: "Meus leads", exact: true }).click();
  await expect.poll(() => boardQueries.at(-1)?.get("assignee")).toBe("me");
  await page
    .getByRole("button", { name: "Filtrar por responsável", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sem responsável", exact: true })
    .click();
  await expect
    .poll(() => boardQueries.at(-1)?.get("assignee"))
    .toBe("unassigned");
});

test("seller options report a failed load and retry", async ({ page }) => {
  await installOperationalCrm(page);
  let attempts = 0;
  await page.route("**/api/v1/identity/member-options", (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE", message: "Indisponível" } },
        })
      : route.fulfill({
          json: {
            members: [
              {
                userId: sellerId,
                name: "Bia Vendedora",
                email: "bia@example.com",
                role: "seller",
              },
            ],
          },
        });
  });
  await page.goto("/crm#/crm?surface=leads");
  await page
    .getByRole("button", { name: "Filtrar por responsável", exact: true })
    .click();
  await expect(
    page.getByText("Não foi possível carregar os membros.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Bia Vendedora", exact: true }),
  ).toBeVisible();
  expect(attempts).toBe(2);
});

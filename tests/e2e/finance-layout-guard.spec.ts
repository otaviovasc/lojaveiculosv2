import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAs } from "./support/auth";
import { qaPersonas } from "./support/personas";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("financial workspace layout guardrails", () => {
  test("expenses keeps V1 hierarchy, aligned actions and unclipped metrics", async ({
    page,
  }) => {
    await openAsOwner(page, "/expenses", "desktop");

    const overview = sectionWithHeading(page, "Fluxo de caixa");
    const typeTabs = page.getByRole("group", { name: "Tipos" });
    const filters = sectionWithHeading(page, "Filtros");
    const ledger = sectionWithHeading(page, "Registro de gastos");
    const urgency = sectionWithHeading(
      page,
      /Atenção imediata|Próximos vencimentos/,
    );
    const positions = await boxes([
      overview,
      typeTabs,
      filters,
      ledger,
      urgency,
    ]);

    expect(positions[0]!.y).toBeLessThan(positions[1]!.y);
    expect(positions[1]!.y).toBeLessThan(positions[2]!.y);
    expect(positions[2]!.y).toBeLessThan(positions[3]!.y);
    expect(positions[3]!.y).toBeLessThan(positions[4]!.y);
    expect(positions[3]!.y).toBeLessThan(900);
    await expectSameRow(pageHeaderActions(page));
    await expectNoClippedText(page, ".feature-stat-card__value");

    await setQaViewport(page, "mobile");
    await page.goto("/expenses");
    await expectWorkspaceHeading(page, "/expenses");
    await waitForSettledWorkspace(page);
    const mobileActions = pageHeaderActions(page);
    await expectSameRow([mobileActions.nth(0), mobileActions.nth(1)]);
    const actionToolbar = page.getByRole("toolbar", {
      name: "Ações da página",
    });
    expect(
      (await locatorBox(mobileActions.nth(2))).width,
    ).toBeGreaterThanOrEqual((await locatorBox(actionToolbar)).width - 2);
    await expectNoClippedText(page, ".feature-stat-card__value");
    await expectMinimumTargets(page.locator(".feature-stat-card"), 44);
    // Ledger rows depend on the seeded period filter; only enforce touch
    // targets when the ledger actually renders row actions.
    const ledgerActions = page.locator(".finance-mobile-action:visible");
    if ((await ledgerActions.count()) > 0) {
      await expectMinimumTargets(ledgerActions, 44);
    }
    await expectAccessible(page);
    await expectViewportSafe(page);
  });

  test("commissions keeps six distinct summary stats and intentional mobile rows", async ({
    page,
  }) => {
    await openAsOwner(page, "/commissions", "desktop");

    await expectSameRow(pageHeaderActions(page));
    await expectMinimumTargets(
      page.locator(".custom-select-trigger, .datepicker-field-trigger"),
      44,
    );
    const rulesToggle = page.getByRole("button", { name: /Gerenciar \(/ });
    await expect(rulesToggle).toHaveAttribute("aria-expanded", "false");

    await setQaViewport(page, "mobile");
    await page.goto("/commissions");
    await expectWorkspaceHeading(page, "/commissions");
    await waitForSettledWorkspace(page);
    await expectSameRow(pageHeaderActions(page));
    await expect(
      page.locator(".commission-summary-cards .feature-stat-card__value"),
    ).toHaveCount(6);
    await expectNoClippedText(page, ".feature-stat-card__value");
    // Seller metrics render as an intentional 2-column grid on mobile.
    const sellerMetrics = page
      .locator(".commission-seller-card")
      .first()
      .locator(".feature-stat-card");
    await expect(sellerMetrics.first()).toBeVisible();
    const sellerMetricBoxes = await boxes(await allLocators(sellerMetrics));
    expect(sellerMetricBoxes.length).toBeGreaterThanOrEqual(4);
    for (const row of uniqueRows(sellerMetricBoxes)) {
      expect(row.length).toBeLessThanOrEqual(2);
    }
    await expectMinimumTargets(
      page.locator(
        ".commission-icon-action:visible, .commission-seller-action:visible",
      ),
      44,
    );
    await expectAccessible(page);
    await expectViewportSafe(page);
  });

  test("auto entries keeps a 3x2 mobile navigator and content-fit cards", async ({
    page,
  }) => {
    await openAsOwner(page, "/auto-entries", "desktop");

    for (const tab of [
      "Venda",
      "Financiamento",
      "Documentação",
      "Seguro",
      "Consórcio",
    ]) {
      await page.getByRole("tab", { exact: true, name: tab }).click();
      await expectCardsFitContent(page);
    }

    await setQaViewport(page, "mobile");
    await page.goto("/auto-entries");
    await expectWorkspaceHeading(page, "/auto-entries");
    await waitForSettledWorkspace(page);
    const tabs = page.getByRole("tablist").getByRole("tab");
    const tabBoxes = await boxes(await allLocators(tabs));
    expect(tabBoxes).toHaveLength(6);
    expect(uniqueRows(tabBoxes)).toHaveLength(2);
    expect(uniqueRows(tabBoxes).map((row) => row.length)).toEqual([3, 3]);
    expect(
      Math.min(...tabBoxes.map(({ height }) => height)),
    ).toBeGreaterThanOrEqual(44);
    const domainHeading = await locatorBox(
      page.getByRole("heading", { level: 2, name: "Venda concluída" }),
    );
    expect(domainHeading.y).toBeLessThan(844);
    await expectAccessible(page);
    await expectViewportSafe(page);
  });
});

async function openAsOwner(
  page: Page,
  path: string,
  viewport: "desktop" | "mobile",
) {
  await setQaViewport(page, viewport);
  await loginAs(page, qaPersonas.owner);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expectWorkspaceHeading(page, path);
  await waitForSettledWorkspace(page);
}

async function expectWorkspaceHeading(page: Page, path: string) {
  const name =
    path === "/expenses"
      ? "Fluxo de caixa"
      : path === "/commissions"
        ? "Comissões"
        : "Lançamentos automáticos";
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

function pageHeaderActions(page: Page) {
  return page
    .getByRole("toolbar", { name: "Ações da página" })
    .getByRole("button");
}

function sectionWithHeading(page: Page, name: string | RegExp) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name }) })
    .first();
}

async function expectNoClippedText(page: Page, selector: string) {
  const clipped = await page
    .locator(selector)
    .evaluateAll((elements) =>
      elements
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => element.textContent?.trim()),
    );
  expect(clipped).toEqual([]);
}

async function expectMinimumTargets(locator: Locator, minimum: number) {
  const targets = await boxes(await allLocators(locator));
  expect(targets.length).toBeGreaterThan(0);
  expect(
    Math.min(...targets.map(({ height }) => height)),
  ).toBeGreaterThanOrEqual(minimum);
}

async function expectSameRow(target: Locator | Locator[]) {
  if (!Array.isArray(target)) {
    await expect(target.first()).toBeVisible();
  }
  const targetBoxes = await boxes(
    Array.isArray(target) ? target : await allLocators(target),
  );
  expect(targetBoxes.length).toBeGreaterThan(1);
  const rows = targetBoxes.map(({ y }) => y);
  expect(Math.max(...rows) - Math.min(...rows)).toBeLessThanOrEqual(2);
}

async function expectCardsFitContent(page: Page) {
  const gaps = await page
    .locator(".auto-entry-domain-card")
    .evaluateAll((cards) =>
      cards.map((card) => {
        const content = card.querySelector<HTMLElement>(
          ".auto-entry-domain-card__content",
        );
        if (!content) return Number.POSITIVE_INFINITY;
        const padding = Number.parseFloat(getComputedStyle(card).paddingBottom);
        return (
          card.getBoundingClientRect().bottom -
          content.getBoundingClientRect().bottom -
          padding
        );
      }),
    );
  expect(Math.max(...gaps)).toBeLessThanOrEqual(10);
}

async function allLocators(locator: Locator) {
  return Promise.all(
    Array.from({ length: await locator.count() }, (_, index) =>
      locator.nth(index),
    ),
  );
}

async function boxes(locators: Locator[]) {
  return Promise.all(locators.map(locatorBox));
}

async function locatorBox(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

function uniqueRows(
  rects: Array<{ height: number; width: number; x: number; y: number }>,
) {
  const rows = new Map<number, typeof rects>();
  for (const rect of rects) {
    const y = Math.round(rect.y);
    rows.set(y, [...(rows.get(y) ?? []), rect]);
  }
  return [...rows.values()];
}

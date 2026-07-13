import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import { qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

const documentPermissions = [
  "documents.download",
  "documents.preview",
  "documents.read",
  "documents.upload",
  "documents.void",
  "inventory.read",
];

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test("keeps document KPIs and rows readable across viewports", async ({
  page,
}, testInfo) => {
  await installLocalSession(page, {
    permissions: documentPermissions,
    persona: qaPersonas.owner,
  });

  await setQaViewport(page, "desktop");
  await page.goto("/documents");
  await expect(page.getByRole("heading", { name: "Geral" })).toBeVisible();

  const table = page.getByRole("table");
  const issuedRow = table
    .locator("tbody tr", { hasText: "Comprovante de pagamento" })
    .first();
  const statusBadge = issuedRow.getByText("Emitido", { exact: true });
  const actionCell = issuedRow.locator("td").last();
  await expect(table).toBeVisible();
  await expect(statusBadge).toBeVisible();
  await expect(
    issuedRow.getByRole("button", { name: "Visualizar documento" }),
  ).toBeVisible();
  await expect(
    issuedRow.getByRole("button", { name: "Baixar documento" }),
  ).toBeVisible();
  expect(await isTextClipped(statusBadge)).toBe(false);
  expect((await actionCell.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(
    150,
  );
  await expectViewportSafe(page);
  await expectNoBlockingAxeViolations(page);
  await saveQaScreenshot(page, testInfo, "documents-readable-desktop");

  await setQaViewport(page, "mobile");
  await page.goto("/documents");
  await expect(page.getByRole("heading", { name: "Geral" })).toBeVisible();

  const kpiStrip = page.getByRole("group", { name: "Resumo de documentos" });
  const mobileList = page.getByTestId("documents-mobile-list");
  await expect(kpiStrip).toBeVisible();
  await expect(mobileList).toBeVisible();
  await expect(table).toBeHidden();
  await expect(
    mobileList.getByRole("button", { name: "Visualizar documento" }).first(),
  ).toBeVisible();
  await expect(
    mobileList.getByText("Emitido", { exact: true }).first(),
  ).toBeVisible();
  expect(
    await kpiStrip.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns,
    ),
  ).toMatch(/\S+\s+\S+/);
  await expectViewportSafe(page);
  await expectNoBlockingAxeViolations(page);
  await saveQaScreenshot(page, testInfo, "documents-readable-mobile");
});

test("announces the document loading state without accessibility blockers", async ({
  page,
}, testInfo) => {
  await installLocalSession(page, {
    permissions: documentPermissions,
    persona: qaPersonas.owner,
  });
  let releaseDocuments!: () => void;
  const documentsGate = new Promise<void>((resolve) => {
    releaseDocuments = resolve;
  });
  await page.route("**/api/v1/documents*", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname === "/api/v1/documents" &&
      route.request().method() === "GET"
    ) {
      await documentsGate;
    }
    await route.continue();
  });

  try {
    await setQaViewport(page, "mobile");
    await page.goto("/documents");
    await expect(
      page.getByRole("status", { name: "Carregando documentos" }),
    ).toBeVisible();
    await expectViewportSafe(page);
    await expectNoBlockingAxeViolations(page);
    await saveQaScreenshot(page, testInfo, "documents-loading-mobile");
  } finally {
    releaseDocuments();
  }
});

async function isTextClipped(locator: ReturnType<Page["locator"]>) {
  return locator.evaluate(
    (element) => element.scrollWidth > element.clientWidth + 1,
  );
}

async function expectViewportSafe(page: Page) {
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
}

async function expectNoBlockingAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    result.violations.filter(({ impact }) =>
      ["critical", "serious"].includes(impact ?? ""),
    ),
  ).toEqual([]);
}

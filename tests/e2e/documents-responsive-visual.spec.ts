import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import {
  expectNoBlockingAxeViolations,
  expectViewportSafe,
} from "./support/pageChecks";
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
  await installAutomaticDocumentsOnly(page);

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
  await expectStableFolderCountBadge(page);
  await expectStableOriginFilter(page);
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
  await expectStableOriginFilter(page);
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

async function expectStableFolderCountBadge(page: Page) {
  const folderRow = page.locator(".documents-folder-sidebar-row").first();
  await expect(folderRow).toBeVisible();
  const [initial, changed] = await folderRow.evaluate((row) => {
    const title = row.querySelector("strong");
    const badge = row.querySelector<HTMLElement>(
      ".documents-folder-sidebar-count",
    );
    if (!title || !badge) throw new Error("Pasta sem titulo ou contador.");

    const originalTitle = title.textContent;
    const originalCount = badge.textContent;
    const read = () => {
      const rowRect = row.getBoundingClientRect();
      const badgeRect = badge.getBoundingClientRect();
      return [
        badgeRect.height,
        badgeRect.width,
        rowRect.right - badgeRect.right,
      ] as const;
    };
    const before = read();
    title.textContent = "Unidade com um titulo muito mais longo";
    badge.textContent = "888";
    const after = read();
    title.textContent = originalTitle;
    badge.textContent = originalCount;
    return [before, after] as const;
  });

  changed.forEach((measurement, index) => {
    expect(measurement).toBeCloseTo(initial[index], 1);
  });
}

async function expectStableOriginFilter(page: Page) {
  const originFilter = page.getByRole("group", {
    name: "Origem dos documentos",
  });
  const options = ["Todos", "Automáticos", "Manuais"] as const;
  await expect(originFilter).toBeVisible();
  const initialWidth = (await originFilter.boundingBox())?.width ?? 0;
  expect(initialWidth).toBeGreaterThan(0);

  for (const label of options) {
    const option = originFilter.getByRole("button", {
      exact: true,
      name: label,
    });
    await option.click();
    await expect(option).toHaveAttribute("aria-pressed", "true");
    await expect(
      originFilter.locator('button[aria-pressed="true"]'),
    ).toHaveCount(1);
    await expect(
      originFilter.locator('button[aria-pressed="false"]'),
    ).toHaveCount(2);
    await page.waitForTimeout(400);
    const currentWidth = (await originFilter.boundingBox())?.width ?? 0;
    expect(Math.abs(currentWidth - initialWidth)).toBeLessThanOrEqual(1);

    const optionWidths = await originFilter
      .getByRole("button")
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getBoundingClientRect().width),
      );
    expect(
      Math.max(...optionWidths) - Math.min(...optionWidths),
    ).toBeLessThanOrEqual(1);
    expect(await isTextClipped(option)).toBe(false);
  }

  await originFilter
    .getByRole("button", { exact: true, name: "Todos" })
    .click();
}

async function installAutomaticDocumentsOnly(page: Page) {
  await page.route("**/api/v1/documents*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== "GET" || url.pathname !== "/api/v1/documents") {
      await route.continue();
      return;
    }

    const response = await route.fetch();
    const payload = (await response.json()) as {
      documents: Array<{
        metadata?: Record<string, unknown>;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
    await route.fulfill({
      json: {
        ...payload,
        documents: payload.documents.map((document) => ({
          ...document,
          metadata: { ...document.metadata, manualUpload: false },
        })),
      },
      response,
    });
  });
}

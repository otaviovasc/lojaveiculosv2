import { expect, test, type Locator } from "@playwright/test";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("dark theme contrast", () => {
  test("keeps current sales controls readable", async ({ page }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);

    await setQaViewport(page, "desktop");
    await loginAs(page, qaPersonas.owner, testInfo);
    await page.evaluate(() => {
      localStorage.setItem("lojaveiculosv2.theme", "dark");
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
    });
    await page.getByRole("button", { name: "Vendas" }).click();
    await expect(
      page.getByRole("heading", { name: "Formalização de Vendas" }),
    ).toBeVisible();

    const firstSaleCard = page
      .locator(".sales-glass-panel")
      .filter({
        has: page.getByRole("button", { name: "Editar" }),
      })
      .first();
    const listSamples = [
      {
        locator: page.getByRole("button", { name: "Vendas" }),
        name: "active sidebar navigation",
      },
      {
        locator: page.locator(".custom-select-trigger").first(),
        name: "selected sales status filter",
      },
      {
        locator: page.getByRole("button", { name: "Nova Venda" }),
        name: "new sale action",
      },
      {
        locator: firstSaleCard.locator("h3"),
        name: "sales card title",
      },
      {
        locator: firstSaleCard.getByText("Valor Acordado", { exact: true }),
        name: "sales card metadata",
      },
    ];

    for (const sample of listSamples) {
      await expect(sample.locator, sample.name).toBeVisible();
      await expectReadableContrast(sample.locator, sample.name);
    }

    await firstSaleCard.getByRole("button", { name: "Editar" }).click();
    await expect(
      page.getByRole("heading", {
        exact: true,
        name: "Formalização de Venda",
      }),
    ).toBeVisible();
    await page
      .locator(".sales-wizard-step")
      .filter({ hasText: "Valores, Pagos & Serviços" })
      .click();

    const activeWorkspaceStep = page
      .locator(".sales-wizard-step-active")
      .filter({ hasText: "Valores, Pagos & Serviços" });
    await expect(activeWorkspaceStep, "active sales wizard step").toBeVisible();
    await expectReadableContrast(
      activeWorkspaceStep,
      "active sales wizard step",
    );

    expectNoPageCrashes(diagnostics);
  });
});

async function expectReadableContrast(locator: Locator, name: string) {
  const colors = await locator.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Unable to resolve browser colors");

    const readColor = (value: string): Rgb => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = "rgba(0, 0, 0, 0)";
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, alpha = 0] = context.getImageData(
        0,
        0,
        1,
        1,
      ).data;
      return { a: alpha / 255, b, g, r };
    };
    const composite = (foreground: Rgb, background: Rgb): Rgb => {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      if (alpha === 0) return { a: 0, b: 0, g: 0, r: 0 };
      return {
        a: alpha,
        b:
          (foreground.b * foreground.a +
            background.b * background.a * (1 - foreground.a)) /
          alpha,
        g:
          (foreground.g * foreground.a +
            background.g * background.a * (1 - foreground.a)) /
          alpha,
        r:
          (foreground.r * foreground.a +
            background.r * background.a * (1 - foreground.a)) /
          alpha,
      };
    };

    const backgrounds: Rgb[] = [];
    let current: Element | null = element;
    while (current) {
      backgrounds.push(readColor(getComputedStyle(current).backgroundColor));
      current = current.parentElement;
    }
    const background = backgrounds
      .reverse()
      .reduce((resolved, layer) => composite(layer, resolved), {
        a: 1,
        b: 255,
        g: 255,
        r: 255,
      });
    const foreground = composite(
      readColor(getComputedStyle(element).color),
      background,
    );
    return { background, foreground };
  });
  const ratio = contrastRatio(colors.foreground, colors.background);

  expect(ratio, `${name} contrast ratio`).toBeGreaterThanOrEqual(4.5);
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance({ b, g, r }: Rgb): number {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

type Rgb = {
  a: number;
  b: number;
  g: number;
  r: number;
};

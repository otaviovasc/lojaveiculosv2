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
  test("keeps selected sales controls readable", async ({ page }, testInfo) => {
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
      page.getByRole("heading", { name: "Workspace de Vendas" }),
    ).toBeVisible();
    await page
      .locator(".sales-wizard-step")
      .filter({ hasText: "Pagamentos" })
      .click();

    const samples = [
      {
        locator: page.getByRole("button", { name: "Vendas" }),
        name: "active sidebar navigation",
      },
      {
        locator: page.locator(".sales-filter-btn-active").first(),
        name: "active sales filter",
      },
      {
        locator: page.locator(".sales-card-item-active .text-app-text").first(),
        name: "active sales card title",
      },
      {
        locator: page.locator(".sales-card-item-active .text-muted").first(),
        name: "active sales card metadata",
      },
      {
        locator: page.locator(".sales-wizard-step-active").first(),
        name: "active sales wizard step",
      },
    ];

    for (const sample of samples) {
      await expect(sample.locator, sample.name).toBeVisible();
      await expectReadableContrast(sample.locator, sample.name);
    }

    expectNoPageCrashes(diagnostics);
  });
});

async function expectReadableContrast(locator: Locator, name: string) {
  const colors = await locator.evaluate((element) => {
    let current: Element | null = element;
    while (current) {
      const backgroundColor = getComputedStyle(current).backgroundColor;
      const alpha = Number(
        backgroundColor.match(
          /rgba?\(\d+(?:\.\d+)?,\s*\d+(?:\.\d+)?,\s*\d+(?:\.\d+)?(?:,\s*(\d+(?:\.\d+)?))?\)/,
        )?.[1] ?? "1",
      );
      if (alpha > 0.01) {
        return {
          background: backgroundColor,
          foreground: getComputedStyle(element).color,
        };
      }
      current = current.parentElement;
    }
    return {
      background: "rgb(255, 255, 255)",
      foreground: getComputedStyle(element).color,
    };
  });
  const ratio = contrastRatio(
    parseCssColor(colors.foreground),
    parseCssColor(colors.background),
  );

  expect(ratio, `${name} contrast ratio`).toBeGreaterThanOrEqual(4.5);
}

function parseCssColor(value: string): Rgb {
  const rgbMatch = value.match(
    /rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)/,
  );
  if (rgbMatch?.[1] && rgbMatch[2] && rgbMatch[3]) {
    return {
      a: rgbMatch[4] ? Number(rgbMatch[4]) : 1,
      b: Number(rgbMatch[3]),
      g: Number(rgbMatch[2]),
      r: Number(rgbMatch[1]),
    };
  }

  const oklabMatch = value.match(
    /oklab\((\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?\)/,
  );
  if (oklabMatch?.[1] && oklabMatch[2] && oklabMatch[3]) {
    return oklabToRgb({
      a: Number(oklabMatch[2]),
      alpha: oklabMatch[4] ? Number(oklabMatch[4]) : 1,
      b: Number(oklabMatch[3]),
      l: Number(oklabMatch[1]),
    });
  }

  throw new Error(`Unsupported CSS color: ${value}`);
}

function oklabToRgb({ a, alpha, b, l }: Oklab): Rgb {
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;
  const lLinear = lPrime ** 3;
  const mLinear = mPrime ** 3;
  const sLinear = sPrime ** 3;

  return {
    a: alpha,
    b: linearSrgbToRgb(
      -0.0041960863 * lLinear - 0.7034186147 * mLinear + 1.707614701 * sLinear,
    ),
    g: linearSrgbToRgb(
      -1.2684380046 * lLinear + 2.6097574011 * mLinear - 0.3413193965 * sLinear,
    ),
    r: linearSrgbToRgb(
      4.0767416621 * lLinear - 3.3077115913 * mLinear + 0.2309699292 * sLinear,
    ),
  };
}

function linearSrgbToRgb(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  const encoded =
    clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return encoded * 255;
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

type Oklab = {
  a: number;
  alpha: number;
  b: number;
  l: number;
};

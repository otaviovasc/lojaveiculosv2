import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function waitForSettledWorkspace(page: Page) {
  await expect(page.locator("body")).not.toHaveAttribute("aria-busy", "true");
  await page.waitForTimeout(900);
}

export async function expectViewportSafe(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect
    .soft(
      overflow.scrollWidth,
      `page width ${overflow.scrollWidth}px exceeds viewport ${overflow.clientWidth}px`,
    )
    .toBeLessThanOrEqual(overflow.clientWidth + 1);
}

export async function expectAccessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = result.violations.filter(({ impact }) =>
    ["critical", "serious"].includes(impact ?? ""),
  );

  expect
    .soft(
      blocking,
      blocking
        .map(
          ({ help, id, nodes }) =>
            `${id}: ${help} (${nodes.length} affected node${nodes.length === 1 ? "" : "s"})`,
        )
        .join("\n"),
    )
    .toEqual([]);
}

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function waitForSettledWorkspace(page: Page) {
  await expect(page.locator("body")).not.toHaveAttribute("aria-busy", "true");
  await page.waitForTimeout(900);
}

export async function expectViewportSafe(page: Page) {
  const overflow = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          className: element.className.toString().slice(0, 120),
          id: element.id,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          tagName: element.tagName.toLowerCase(),
          text: (element.textContent ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 80),
          width: Math.round(rect.width),
        };
      })
      .filter(
        ({ left, right, width }) =>
          width > 0 && (left < -1 || right > clientWidth + 1),
      )
      .slice(0, 16);

    return {
      clientWidth,
      offenders,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });

  expect
    .soft(
      overflow.scrollWidth,
      [
        `page width ${overflow.scrollWidth}px exceeds viewport ${overflow.clientWidth}px`,
        ...overflow.offenders.map(
          ({ className, id, left, right, tagName, text, width }) =>
            `${tagName}${id ? `#${id}` : ""}${className ? `.${className.replace(/\s+/g, ".")}` : ""} left=${left} right=${right} width=${width} text=${JSON.stringify(text)}`,
        ),
      ].join("\n"),
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

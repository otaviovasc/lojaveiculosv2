import { expect, type Page } from "@playwright/test";

export function collectCriticalResponses(page: Page) {
  const criticalResponses: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 500) {
      criticalResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  return criticalResponses;
}

export async function expectNoCriticalResponses(
  page: Page,
  criticalResponses: string[],
) {
  await page.waitForLoadState("networkidle");
  expect(criticalResponses).toEqual([]);
}

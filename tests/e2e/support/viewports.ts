import type { Page } from "@playwright/test";

export const qaViewports = {
  desktop: { height: 900, width: 1440 },
  mobile: { height: 844, width: 390 },
} as const;

export type QaViewport = keyof typeof qaViewports;

export async function setQaViewport(page: Page, viewport: QaViewport) {
  await page.setViewportSize(qaViewports[viewport]);
}

import { expect, type Page } from "@playwright/test";

export type QaPageDiagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
};

export function collectPageDiagnostics(page: Page): QaPageDiagnostics {
  const diagnostics: QaPageDiagnostics = {
    consoleErrors: [],
    pageErrors: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      diagnostics.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.pageErrors.push(error.message);
  });

  return diagnostics;
}

export function expectNoPageCrashes(diagnostics: QaPageDiagnostics) {
  expect(diagnostics.pageErrors).toEqual([]);
}

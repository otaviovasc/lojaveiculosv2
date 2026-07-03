import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page, TestInfo } from "@playwright/test";

export async function saveQaScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  const screenshotPath = resolveQaArtifactPath(testInfo, `${name}.png`);
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: screenshotPath,
  });
}

function resolveQaArtifactPath(testInfo: TestInfo, fileName: string) {
  return path.join(
    process.env.QA_ARTIFACT_ROOT ?? "/tmp/lojaveiculosv2-qa",
    safeArtifactName(process.env.QA_BRANCH_SLUG ?? currentBranchName()),
    safeArtifactName(process.env.QA_FEATURE_SLUG ?? featureName(testInfo)),
    safeArtifactName(fileName),
  );
}

function currentBranchName() {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "local";
  }
}

function featureName(testInfo: TestInfo) {
  return path.basename(testInfo.file).replace(/\.spec\.[cm]?[jt]sx?$/, "");
}

function safeArtifactName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

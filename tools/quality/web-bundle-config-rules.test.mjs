import { describe, expect, it } from "vitest";
import webBundlePolicy from "./web-bundle-policy.json" with { type: "json" };
import { findWebBundleConfigViolations } from "./web-bundle-config-rules.mjs";

describe("web bundle config rules", () => {
  it("accepts the reviewed budgets, Vite build policy, and verified build order", () => {
    expect(findWebBundleConfigViolations(validInput())).toEqual([]);
  });

  it("rejects budget inflation and executable static exceptions", () => {
    const input = validInput();
    input.policy.limits.javascript = 580_001;
    input.policy.limits.stylesheet = 645_001;
    input.policy.workerExceptions[0].maxBytes = 1_080_001;
    input.policy.staticExtensions.push(".js");

    expect(findWebBundleConfigViolations(input)).toEqual(
      expect.arrayContaining([
        "javascript budget must not exceed 580000 bytes",
        "stylesheet budget must not exceed 645000 bytes",
        "worker budget must not exceed 1080000 bytes",
        "staticExtensions must match the reviewed non-code allowlist",
      ]),
    );
  });

  it("rejects missing manifest cleanup, reporting, or automatic code splitting", () => {
    const input = validInput();
    input.viteConfigSource = input.viteConfigSource
      .replace("emptyOutDir: true", "emptyOutDir: false")
      .replace("manifest: true", "manifest: false")
      .replace("reportCompressedSize: true", "reportCompressedSize: false")
      .replace("codeSplitting: true", "codeSplitting: false");

    expect(findWebBundleConfigViolations(input)).toEqual(
      expect.arrayContaining([
        "apps/web/vite.config.ts: build.emptyOutDir must remain true",
        "apps/web/vite.config.ts: build.manifest must remain true",
        "apps/web/vite.config.ts: build.reportCompressedSize must remain true",
        "apps/web/vite.config.ts: build.codeSplitting must remain true",
      ]),
    );
  });

  it("rejects independent warning limits and deprecated chunking controls", () => {
    const input = validInput();
    input.viteConfigSource = input.viteConfigSource
      .replace(
        "webBundlePolicy.limits.javascript / 1_000",
        "webBundlePolicy.limits.javascript / 2_000",
      )
      .replace(
        "codeSplitting: true",
        "codeSplitting: true, manualChunks: () => 'vendor'",
      );

    expect(findWebBundleConfigViolations(input)).toEqual(
      expect.arrayContaining([
        "apps/web/vite.config.ts: build.chunkSizeWarningLimit must derive from the byte policy",
        "apps/web/vite.config.ts: build must not use deprecated manualChunks",
      ]),
    );
  });

  it("rejects stale-artifact verification or a bypassed deployable build", () => {
    const input = validInput();
    input.rootScripts["build:deployables"] =
      "pnpm run verify:web-bundle && pnpm --filter @lojaveiculosv2/web build";
    input.rootScripts["verify:web-bundle"] = "echo skipped";
    input.webScripts.build = "vite build";

    expect(findWebBundleConfigViolations(input)).toEqual(
      expect.arrayContaining([
        'build:deployables must be "pnpm --filter @lojaveiculosv2/web build && pnpm run verify:web-bundle && pnpm --filter @lojaveiculosv2/api build"',
        'verify:web-bundle must be "node tools/quality/verify-web-bundle-artifacts.mjs"',
        'apps/web build must be "tsc -b && vite build"',
      ]),
    );
  });
});

function validInput() {
  return {
    policy: structuredClone(webBundlePolicy),
    rootScripts: {
      "build:deployables":
        "pnpm --filter @lojaveiculosv2/web build && pnpm run verify:web-bundle && pnpm --filter @lojaveiculosv2/api build",
      "check:web-bundle": "node tools/quality/check-web-bundle.mjs",
      "verify:web-bundle": "node tools/quality/verify-web-bundle-artifacts.mjs",
    },
    viteConfigSource: `
      import { defineConfig } from "vite";
      import webBundlePolicy from "../../tools/quality/web-bundle-policy.json" with { type: "json" };
      export default defineConfig({
        build: {
          chunkSizeWarningLimit: webBundlePolicy.limits.javascript / 1_000,
          emptyOutDir: true,
          manifest: true,
          outDir: "dist",
          reportCompressedSize: true,
          rolldownOptions: { output: { codeSplitting: true } },
        },
      });
    `,
    webScripts: { build: "tsc -b && vite build" },
  };
}

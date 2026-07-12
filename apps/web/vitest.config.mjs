import { defineConfig, mergeConfig } from "vitest/config";
import { createCoverageConfig } from "../../tools/testing/vitest-coverage-policy.mjs";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig(createCoverageConfig("@lojaveiculosv2/web")),
);

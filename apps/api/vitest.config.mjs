import { configDefaults, defineConfig } from "vitest/config";
import { createCoverageConfig } from "../../tools/testing/vitest-coverage-policy.mjs";

const coverageConfig = createCoverageConfig("@lojaveiculosv2/api");

export default defineConfig({
  ...coverageConfig,
  test: {
    ...coverageConfig.test,
    exclude: [...configDefaults.exclude, "dist/**"],
  },
});

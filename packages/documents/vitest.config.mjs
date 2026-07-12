import { defineConfig } from "vitest/config";
import { createCoverageConfig } from "../../tools/testing/vitest-coverage-policy.mjs";

export default defineConfig(createCoverageConfig("@lojaveiculosv2/documents"));

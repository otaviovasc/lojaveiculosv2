import { describe, expect, it } from "vitest";
import {
  coveragePolicies,
  createCoverageConfig,
  createVitestPerformanceConfig,
  scopedCoveragePolicies,
} from "../testing/vitest-coverage-policy.mjs";

describe("Vitest resource policy", () => {
  it.each(Object.keys(coveragePolicies))(
    "caps %s workers without weakening assertions or coverage",
    (workspaceName) => {
      const config = createCoverageConfig(workspaceName);

      expect(config.test.maxWorkers).toBe(
        workspaceName === "@lojaveiculosv2/api" ? 4 : "75%",
      );
      expect(config.test.expect).toEqual({
        requireAssertions: true,
      });
      expect(config.test.coverage.exclude).toContain(
        "src/**/*.rawDb.testSupport.ts",
      );
      expect(config.test.coverage.thresholds).toEqual({
        ...coveragePolicies[workspaceName],
        ...(scopedCoveragePolicies[workspaceName] ?? {}),
      });
    },
  );

  it("keeps performance experiments opt-in", () => {
    expect(createVitestPerformanceConfig({})).toEqual({});
  });

  it("maps supported performance experiments to Vitest options", () => {
    expect(
      createVitestPerformanceConfig({
        VITEST_FS_MODULE_CACHE: "1",
        VITEST_IMPORT_DURATIONS: "1",
        VITEST_POOL: "threads",
        VITEST_FILE_PARALLELISM: "false",
        VITEST_OPTIMIZER_INCLUDE:
          "@testing-library/react, lucide-react, @testing-library/react",
      }),
    ).toEqual({
      experimental: {
        fsModuleCache: true,
        importDurations: { print: true },
      },
      pool: "threads",
      fileParallelism: false,
      deps: {
        optimizer: {
          client: {
            enabled: true,
            include: ["@testing-library/react", "lucide-react"],
          },
          ssr: {
            enabled: true,
            include: ["@testing-library/react", "lucide-react"],
          },
        },
      },
    });
  });
});

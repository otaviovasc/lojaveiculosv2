import { describe, expect, it } from "vitest";
import {
  coveragePolicies,
  createCoverageConfig,
  scopedCoveragePolicies,
} from "../testing/vitest-coverage-policy.mjs";

describe("Vitest resource policy", () => {
  it.each(Object.keys(coveragePolicies))(
    "caps %s workers without weakening assertions or coverage",
    (workspaceName) => {
      const config = createCoverageConfig(workspaceName);

      expect(config.test.maxWorkers).toBe("75%");
      expect(config.test.expect).toEqual({
        requireAssertions: true,
      });
      expect(config.test.coverage.thresholds).toEqual({
        ...coveragePolicies[workspaceName],
        ...(scopedCoveragePolicies[workspaceName] ?? {}),
      });
    },
  );
});

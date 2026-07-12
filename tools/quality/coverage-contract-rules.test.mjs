import { describe, expect, it } from "vitest";
import {
  findCoverageContractViolations,
  minimumCoveragePolicies,
  minimumScopedCoveragePolicies,
} from "./coverage-contract-rules.mjs";

const apiWorkspace = {
  configSource: 'createCoverageConfig("@lojaveiculosv2/api")',
  name: "@lojaveiculosv2/api",
  testCoverage: "vitest run --coverage",
};
const apiScopedPolicies = {
  "@lojaveiculosv2/api": minimumScopedCoveragePolicies[apiWorkspace.name],
};

describe("coverage contract rules", () => {
  it("accepts a fully wired workspace at or above its floor", () => {
    expect(
      findCoverageContractViolations({
        policies: {
          "@lojaveiculosv2/api": minimumCoveragePolicies[apiWorkspace.name],
        },
        rootCoverageScript: "pnpm -r test:coverage",
        scopedPolicies: apiScopedPolicies,
        workspaces: [apiWorkspace],
      }),
    ).toEqual([]);
  });

  it("rejects lowered thresholds", () => {
    const failures = findCoverageContractViolations({
      policies: {
        "@lojaveiculosv2/api": {
          ...minimumCoveragePolicies[apiWorkspace.name],
          branches: 1,
        },
      },
      rootCoverageScript: "pnpm -r test:coverage",
      scopedPolicies: apiScopedPolicies,
      workspaces: [apiWorkspace],
    });

    expect(failures).toContain(
      "@lojaveiculosv2/api branches coverage cannot fall below 51.1",
    );
  });

  it("rejects skipped workspace coverage or detached configs", () => {
    const failures = findCoverageContractViolations({
      policies: {
        "@lojaveiculosv2/api": minimumCoveragePolicies[apiWorkspace.name],
      },
      rootCoverageScript: "pnpm -r --if-present test:coverage",
      scopedPolicies: apiScopedPolicies,
      workspaces: [
        { ...apiWorkspace, configSource: "", testCoverage: "echo skipped" },
      ],
    });

    expect(failures).toEqual([
      "root test:coverage must run every workspace without opt-outs",
      "@lojaveiculosv2/api must expose vitest run --coverage",
      "@lojaveiculosv2/api must load its canonical coverage policy",
    ]);
  });

  it("rejects missing and stale policies", () => {
    const failures = findCoverageContractViolations({
      policies: {
        "@lojaveiculosv2/removed": minimumCoveragePolicies[apiWorkspace.name],
      },
      rootCoverageScript: "pnpm -r test:coverage",
      scopedPolicies: apiScopedPolicies,
      workspaces: [apiWorkspace],
    });

    expect(failures).toContain(
      "@lojaveiculosv2/api is missing a coverage threshold policy",
    );
    expect(failures).toContain(
      "@lojaveiculosv2/removed has a stale coverage threshold policy",
    );
  });

  it("requires high per-file coverage for shared web libraries", () => {
    const webWorkspace = {
      ...apiWorkspace,
      configSource: 'createCoverageConfig("@lojaveiculosv2/web")',
      name: "@lojaveiculosv2/web",
    };
    const policies = {
      "@lojaveiculosv2/web": minimumCoveragePolicies[webWorkspace.name],
    };

    const missing = findCoverageContractViolations({
      policies,
      rootCoverageScript: "pnpm -r test:coverage",
      scopedPolicies: {},
      workspaces: [webWorkspace],
    });
    expect(missing).toContain(
      "@lojaveiculosv2/web is missing scoped coverage policy src/lib/**/*.{ts,tsx}",
    );

    const weakened = findCoverageContractViolations({
      policies,
      rootCoverageScript: "pnpm -r test:coverage",
      scopedPolicies: {
        "@lojaveiculosv2/web": {
          "src/lib/**/*.{ts,tsx}": {
            ...minimumScopedCoveragePolicies["@lojaveiculosv2/web"][
              "src/lib/**/*.{ts,tsx}"
            ],
            branches: 1,
            perFile: false,
          },
        },
      },
      workspaces: [webWorkspace],
    });
    expect(weakened).toEqual(
      expect.arrayContaining([
        "@lojaveiculosv2/web src/lib/**/*.{ts,tsx} coverage must be checked per file",
        "@lojaveiculosv2/web src/lib/**/*.{ts,tsx} branches coverage cannot fall below 95",
      ]),
    );
  });

  it("locks critical permission and marketplace error seams at full coverage", () => {
    const webSessionPattern = "src/features/account/sessionPermissions.ts";
    const marketplacePattern =
      "src/domains/marketplace/services/MarketplaceService/marketplaceAccountPreflightMessages.ts";

    expect(
      minimumScopedCoveragePolicies["@lojaveiculosv2/web"][webSessionPattern],
    ).toEqual({
      branches: 100,
      functions: 100,
      lines: 100,
      perFile: true,
      statements: 100,
    });
    expect(
      minimumScopedCoveragePolicies["@lojaveiculosv2/api"][marketplacePattern],
    ).toEqual({
      branches: 100,
      functions: 100,
      lines: 100,
      perFile: true,
      statements: 100,
    });
    for (const module of [
      "cancelFiscalDocument",
      "issueFiscalDocument",
      "serviceSupport",
      "syncFiscalDocumentStatus",
    ]) {
      expect(
        minimumScopedCoveragePolicies["@lojaveiculosv2/api"][
          `src/domains/fiscal/services/FiscalService/${module}.ts`
        ],
      ).toEqual({
        branches: 100,
        functions: 100,
        lines: 100,
        perFile: true,
        statements: 100,
      });
    }
  });
});

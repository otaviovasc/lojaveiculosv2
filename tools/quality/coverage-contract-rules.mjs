const metrics = ["branches", "functions", "lines", "statements"];

export const minimumCoveragePolicies = {
  "@lojaveiculosv2/api": policy(63.5, 51.1, 64.4, 66.1),
  "@lojaveiculosv2/audit": policy(97.4, 86.9, 100, 96.8),
  "@lojaveiculosv2/audit-db": policy(95, 100, 83.3, 95),
  "@lojaveiculosv2/config": policy(100, 100, 100, 100),
  "@lojaveiculosv2/db": policy(52.5, 50, 28, 52.5),
  "@lojaveiculosv2/design-system": policy(100, 100, 100, 100),
  "@lojaveiculosv2/documents": policy(86.5, 65.5, 77.7, 86.9),
  "@lojaveiculosv2/shared": policy(97.7, 89.4, 100, 100),
  "@lojaveiculosv2/web": policy(36.1, 32.9, 32.9, 37.4),
};

export const minimumScopedCoveragePolicies = {
  "@lojaveiculosv2/api": {
    ...Object.fromEntries(
      [
        "parseZapiInboundMessage",
        "whatsappWebhookEventIssues",
        "zapiInboundContent",
        "zapiPayloadRead",
      ].map((module) => [
        `src/domains/crm/whatsapp/${module}.ts`,
        { ...policy(100, 100, 100, 100), perFile: true },
      ]),
    ),
    ...Object.fromEntries(
      [
        "cancelFiscalDocument",
        "issueFiscalDocument",
        "serviceSupport",
        "syncFiscalDocumentStatus",
      ].map((module) => [
        `src/domains/fiscal/services/FiscalService/${module}.ts`,
        { ...policy(100, 100, 100, 100), perFile: true },
      ]),
    ),
    "src/domains/marketplace/services/MarketplaceService/marketplaceAccountPreflightMessages.ts":
      {
        ...policy(100, 100, 100, 100),
        perFile: true,
      },
  },
  "@lojaveiculosv2/web": {
    "src/features/account/sessionPermissions.ts": {
      ...policy(100, 100, 100, 100),
      perFile: true,
    },
    "src/features/inventory/model/inventoryListSortModel.ts": {
      ...policy(100, 100, 100, 100),
      perFile: true,
    },
    "src/lib/**/*.{ts,tsx}": {
      ...policy(95, 95, 95, 95),
      perFile: true,
    },
  },
};

export function findCoverageContractViolations(input) {
  const failures = [];
  if (input.rootCoverageScript !== "pnpm -r test:coverage") {
    failures.push(
      "root test:coverage must run every workspace without opt-outs",
    );
  }

  const workspaceNames = new Set(input.workspaces.map(({ name }) => name));
  for (const workspace of input.workspaces) {
    if (workspace.testCoverage !== "vitest run --coverage") {
      failures.push(`${workspace.name} must expose vitest run --coverage`);
    }
    if (
      !workspace.configSource.includes(
        `createCoverageConfig("${workspace.name}")`,
      )
    ) {
      failures.push(
        `${workspace.name} must load its canonical coverage policy`,
      );
    }

    const actual = input.policies[workspace.name];
    const minimum = minimumCoveragePolicies[workspace.name];
    if (!actual || !minimum) {
      failures.push(`${workspace.name} is missing a coverage threshold policy`);
      continue;
    }
    for (const metric of metrics) {
      if (actual[metric] < minimum[metric]) {
        failures.push(
          `${workspace.name} ${metric} coverage cannot fall below ${minimum[metric]}`,
        );
      }
    }
  }

  for (const name of Object.keys(input.policies)) {
    if (!workspaceNames.has(name)) {
      failures.push(`${name} has a stale coverage threshold policy`);
    }
  }
  for (const [name, patterns] of Object.entries(
    minimumScopedCoveragePolicies,
  )) {
    if (!workspaceNames.has(name)) continue;
    for (const [pattern, minimum] of Object.entries(patterns)) {
      const actual = input.scopedPolicies?.[name]?.[pattern];
      if (!actual) {
        failures.push(`${name} is missing scoped coverage policy ${pattern}`);
        continue;
      }
      if (actual.perFile !== true) {
        failures.push(`${name} ${pattern} coverage must be checked per file`);
      }
      for (const metric of metrics) {
        if (actual[metric] < minimum[metric]) {
          failures.push(
            `${name} ${pattern} ${metric} coverage cannot fall below ${minimum[metric]}`,
          );
        }
      }
    }
  }
  return failures;
}

function policy(statements, branches, functions, lines) {
  return { branches, functions, lines, statements };
}

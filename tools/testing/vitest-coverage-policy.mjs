const sourcePatterns = ["src/**/*.ts", "src/**/*.tsx"];
const excludedPatterns = [
  "src/**/*.d.ts",
  "src/**/*.test.ts",
  "src/**/*.test.tsx",
  "src/**/*.spec.ts",
  "src/**/*.spec.tsx",
  "src/main.ts",
  "src/main.tsx",
];

export const coveragePolicies = {
  "@lojaveiculosv2/api": metrics(63.5, 51.1, 64.4, 66.1),
  "@lojaveiculosv2/audit": metrics(97.4, 86.9, 100, 96.8),
  "@lojaveiculosv2/audit-db": metrics(95, 100, 83.3, 95),
  "@lojaveiculosv2/config": metrics(100, 100, 100, 100),
  "@lojaveiculosv2/db": metrics(52.5, 50, 28, 52.5),
  "@lojaveiculosv2/design-system": metrics(100, 100, 100, 100),
  "@lojaveiculosv2/documents": metrics(86.5, 65.5, 77.7, 86.9),
  "@lojaveiculosv2/shared": metrics(97.7, 89.4, 100, 100),
  "@lojaveiculosv2/web": metrics(36.1, 32.9, 32.9, 37.4),
};

export const scopedCoveragePolicies = {
  "@lojaveiculosv2/api": {
    ...Object.fromEntries(
      [
        "parseZapiInboundMessage",
        "whatsappWebhookEventIssues",
        "zapiInboundContent",
        "zapiPayloadRead",
      ].map((module) => [
        `src/domains/crm/whatsapp/${module}.ts`,
        { ...metrics(100, 100, 100, 100), perFile: true },
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
        { ...metrics(100, 100, 100, 100), perFile: true },
      ]),
    ),
    "src/domains/marketplace/services/MarketplaceService/marketplaceAccountPreflightMessages.ts":
      {
        ...metrics(100, 100, 100, 100),
        perFile: true,
      },
  },
  "@lojaveiculosv2/web": {
    "src/features/account/sessionPermissions.ts": {
      ...metrics(100, 100, 100, 100),
      perFile: true,
    },
    "src/features/inventory/model/inventoryListSortModel.ts": {
      ...metrics(100, 100, 100, 100),
      perFile: true,
    },
    "src/lib/**/*.{ts,tsx}": {
      ...metrics(95, 95, 95, 95),
      perFile: true,
    },
  },
};

export function createCoverageConfig(workspaceName) {
  const thresholds = coveragePolicies[workspaceName];
  if (!thresholds)
    throw new Error(`Missing coverage policy for ${workspaceName}`);
  return {
    test: {
      expect: {
        requireAssertions: true,
      },
      coverage: {
        exclude: excludedPatterns,
        include: sourcePatterns,
        provider: "v8",
        reporter: ["text-summary"],
        reportOnFailure: true,
        thresholds: {
          ...thresholds,
          ...(scopedCoveragePolicies[workspaceName] ?? {}),
        },
      },
    },
  };
}

function metrics(statements, branches, functions, lines) {
  return { branches, functions, lines, statements };
}

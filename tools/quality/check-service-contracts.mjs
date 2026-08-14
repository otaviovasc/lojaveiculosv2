import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const domainsRoot = new URL("../../apps/api/src/domains", import.meta.url)
  .pathname;
const nonEntrypointFiles = new Set([
  "auditVehicleServiceEvent.ts",
  "composioWhatsappConnectionSetup.types.ts",
  "crmConnectionSetupSupport.ts",
  "crmLeadOutcomeContracts.ts",
  "crmLeadOutcomeMutationSupport.ts",
  "crmLeadOutcomePersistence.ts",
  "crmServiceErrors.ts",
  "financeAutoEntryEvaluator.ts",
  "financeAutoEntryLabels.ts",
  "financeAutoEntryRuleValidation.ts",
  "inquiryReferenceValidation.ts",
  "leadVisitSupport.ts",
  "marketplaceAccountPreflight.ts",
  "marketplaceAccountPreflightMessages.ts",
  "marketplaceCatalogResolution.ts",
  "marketplaceErrors.ts",
  "marketplaceJobIdempotency.ts",
  "marketplaceJobProcessingTypes.ts",
  "marketplaceJobPermissions.ts",
  "marketplaceListingReconciliation.ts",
  "marketplaceReconciliationSupport.ts",
  "marketplaceStockPlanRules.ts",
  "marketplaceStockPlanTypes.ts",
  "materializeFinanceAutoEntries.ts",
  "claimMarketplaceSyncJob.ts",
  "reconcileMarketplaceClaim.ts",
  "runMarketplaceSyncJobAudit.ts",
  "runMarketplaceSyncJobSupport.ts",
  "sendWhatsappVehicleSupport.ts",
  "serviceSupport.ts",
  "summarizeMarketplaceStockPlan.ts",
  "testSupport.ts",
  "types.ts",
  "executeWhatsappSessionCommand.ts",
  "whatsappBotCloseAction.ts",
  "whatsappMessageActionSupport.ts",
  "whatsappQuickMessageMedia.ts",
  "whatsappQuickMessageModels.ts",
  "whatsappQuickMessageServiceSupport.ts",
  "whatsappSessionMutationSupport.ts",
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, files);
    } else if (path.endsWith(".ts") && !path.endsWith(".test.ts")) {
      files.push(path);
    }
  }

  return files;
}

function isServiceFile(file) {
  const fileName = basename(file);
  return file.includes("/services/") && !nonEntrypointFiles.has(fileName);
}

const failures = [];
const domainFiles = walk(domainsRoot);
const delegatedContractHelpers = new Map([
  [
    "claimMarketplaceSyncJob(",
    {
      file: join(
        domainsRoot,
        "marketplace/services/MarketplaceService/claimMarketplaceSyncJob.ts",
      ),
      requiredContracts: ["assertPermission(", "context.logger."],
    },
  ],
  [
    "executeAutomationStepDecision(",
    {
      file: join(
        domainsRoot,
        "automation/services/AutomationService/serviceSupport.ts",
      ),
      requiredContracts: [
        "assertPermission(",
        "input.context.audit.record(",
        "input.context.logger.",
      ],
    },
  ],
]);
const serviceFileNames = new Set(
  domainFiles
    .filter((file) => file.includes("/services/"))
    .map((file) => basename(file)),
);

for (const exception of nonEntrypointFiles) {
  if (!serviceFileNames.has(exception)) {
    failures.push(`${exception}: stale service-contract exception`);
  }
}

for (const [helperName, contract] of delegatedContractHelpers) {
  const helperSource = readFileSync(contract.file, "utf8");
  for (const requiredContract of contract.requiredContracts) {
    if (!helperSource.includes(requiredContract)) {
      failures.push(
        `${contract.file}: trusted helper ${helperName} must retain ${requiredContract}`,
      );
    }
  }
}

for (const file of domainFiles.filter(isServiceFile)) {
  const source = readFileSync(file, "utf8");
  const isContextResolver = source.includes("resolvePermissions(");
  const usesDelegatedContractHelper = [...delegatedContractHelpers.keys()].some(
    (helperName) => source.includes(helperName),
  );

  if (!source.includes("ServiceContext") && !isContextResolver) {
    failures.push(`${file}: service entrypoint must accept ServiceContext`);
  }

  if (
    !source.includes("assertPermission(") &&
    !source.includes("assertAnyPermission(") &&
    !isContextResolver &&
    !usesDelegatedContractHelper
  ) {
    failures.push(`${file}: service must enforce at least one permission`);
  }

  if (
    !source.includes("context.audit.record(") &&
    !source.includes("input.audit.record(") &&
    !source.includes("auditFinanceServiceEvent(") &&
    !source.includes("auditWhatsappServiceEvent(") &&
    !source.includes("auditZapiWebhook(") &&
    !source.includes("recordWhatsappServiceMutation(") &&
    !source.includes("auditSalesServiceEvent(") &&
    !source.includes("auditVehicleServiceEvent(") &&
    !source.includes("recordConclusionOutcomeAudit(") &&
    !source.includes("recordRunAudit(") &&
    !usesDelegatedContractHelper
  ) {
    failures.push(`${file}: service must emit an audit event`);
  }

  if (
    !source.includes("context.logger.") &&
    !source.includes("input.logger.") &&
    !source.includes("logFinanceServiceEvent(") &&
    !source.includes("logWhatsappServiceEvent(") &&
    !source.includes("logSalesServiceEvent(") &&
    !source.includes("logVehicleServiceEvent(") &&
    !usesDelegatedContractHelper
  ) {
    failures.push(`${file}: service must write scoped structured logs`);
  }

  if (isStorefrontCustomPageService(file)) {
    if (
      !source.includes('"store_public_site.manage"') &&
      !source.includes('"public_storefront.read"')
    ) {
      failures.push(
        `${file}: custom page services must declare a page permission`,
      );
    }

    if (basename(file) === "getPublicStorefrontCustomPage.ts") {
      if (!source.includes("findPublicCustomPageBySlug")) {
        failures.push(
          `${file}: public custom pages must use the public page lookup`,
        );
      }
      if (!source.includes("sitePublished")) {
        failures.push(
          `${file}: public custom pages must require published site state`,
        );
      }
    } else if (!source.includes("requireStorefrontPageScope")) {
      failures.push(
        `${file}: admin custom pages must require store/tenant scope`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Service contract violations:");
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

function isStorefrontCustomPageService(file) {
  return (
    file.includes("/domains/storefront/services/StorefrontService/") &&
    basename(file).includes("StorefrontCustomPage")
  );
}

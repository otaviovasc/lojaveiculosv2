import type { EntitlementKey } from "@lojaveiculosv2/shared";
import {
  billingCatalogFeatureKeys,
  historicalBillingCatalogFeatureKeys,
  type BillingCatalogDefinition,
} from "./billingCatalogDefinition.js";

export class BillingCatalogDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingCatalogDefinitionError";
  }
}

export function assertValidBillingCatalog(
  catalog: BillingCatalogDefinition,
): void {
  if (!/^\d{4}-\d{2}-v[1-9]\d*$/.test(catalog.version)) {
    fail(`Invalid catalog version: ${catalog.version}.`);
  }
  if (!Number.isFinite(Date.parse(catalog.publishedAt))) {
    fail(`Invalid publishedAt for catalog ${catalog.version}.`);
  }
  if (catalog.plans.length === 0)
    fail("Catalog must contain at least one plan.");

  assertUnique(
    catalog.plans.map((plan) => plan.code),
    "plan code",
  );
  assertUnique(
    catalog.addons.map((addon) => addon.code),
    "add-on code",
  );
  assertUnique(
    [...catalog.plans, ...catalog.addons].map((item) => item.id),
    "catalog item id",
  );

  const defaults = catalog.plans.filter(
    (plan) => plan.isDefault && plan.status === "active",
  );
  if (defaults.length !== 1) {
    fail("Catalog must contain exactly one active default plan.");
  }

  if (catalog.version === "2026-08-v3") {
    assertUnique(
      catalog.plans.map((plan) => String(plan.selectionRank)),
      "plan selection rank",
    );
    if (catalog.addons.some((addon) => addon.status === "active")) {
      fail("Catalog 2026-08-v3 cannot contain active add-ons.");
    }
  }

  for (const plan of catalog.plans) {
    assertUuid(plan.id, `plan ${plan.code}`);
    assertPrice(plan.monthlyPriceCents, `plan ${plan.code}`);
    assertNullablePositiveInteger(
      plan.limits.sellerLimit,
      `${plan.code}.sellerLimit`,
    );
    assertNullablePositiveInteger(
      plan.limits.vehicleLimit,
      `${plan.code}.vehicleLimit`,
    );
    assertCompleteFeatures(
      plan.code,
      plan.features,
      catalog.version === "2026-08-v3"
        ? billingCatalogFeatureKeys
        : historicalBillingCatalogFeatureKeys,
    );
    if (catalog.version === "2026-08-v3") {
      if (!plan.checkoutMode || !plan.selectionRank || !plan.capabilities) {
        fail(`Plan ${plan.code} is missing v3 checkout metadata.`);
      }
      if (
        plan.features.some(
          (feature) =>
            feature.includedInTrial || feature.trialLimitValue !== null,
        )
      ) {
        fail(`Plan ${plan.code} contains retired trial semantics.`);
      }
    }
  }

  for (const addon of catalog.addons) {
    assertUuid(addon.id, `add-on ${addon.code}`);
    assertPrice(addon.monthlyPriceCents, `add-on ${addon.code}`);
    if (addon.includedInTrial) {
      fail(
        `Paid add-on ${addon.code} cannot be included in the current trial.`,
      );
    }
    const executionLimit = addon.limits.composioToolExecutionsPerBillingMonth;
    if (executionLimit !== undefined) {
      assertPositiveInteger(executionLimit, `${addon.code}.executionLimit`);
    }
  }
}

function assertCompleteFeatures(
  planCode: string,
  features: BillingCatalogDefinition["plans"][number]["features"],
  expectedFeatureKeys: readonly EntitlementKey[],
) {
  assertUnique(
    features.map((feature) => feature.featureKey),
    `feature in plan ${planCode}`,
  );
  const actual = new Set(features.map((feature) => feature.featureKey));
  const missing = expectedFeatureKeys.filter((key) => !actual.has(key));
  if (missing.length || actual.size !== expectedFeatureKeys.length) {
    fail(
      `Plan ${planCode} has an incomplete feature matrix: ${missing.join(", ")}.`,
    );
  }
  for (const feature of features) {
    if (feature.includedInTrial && !feature.included) {
      fail(
        `${planCode}.${feature.featureKey} is trial-enabled but not included.`,
      );
    }
    assertNullableNonNegativeInteger(
      feature.limitValue,
      `${planCode}.${feature.featureKey}.limitValue`,
    );
    assertNullableNonNegativeInteger(
      feature.trialLimitValue,
      `${planCode}.${feature.featureKey}.trialLimitValue`,
    );
    if (
      feature.trialLimitValue !== null &&
      (!feature.includedInTrial ||
        feature.limitValue === null ||
        feature.trialLimitValue > feature.limitValue)
    ) {
      fail(`Invalid trial limit for ${planCode}.${feature.featureKey}.`);
    }
  }
}

function assertUnique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length) fail(`Duplicate ${label}.`);
}

function assertUuid(value: string, label: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    fail(`Invalid UUID for ${label}.`);
  }
}

function assertPrice(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0)
    fail(`Invalid price for ${label}.`);
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) fail(`Invalid ${label}.`);
}

function assertNullablePositiveInteger(value: number | null, label: string) {
  if (value !== null) assertPositiveInteger(value, label);
}

function assertNullableNonNegativeInteger(value: number | null, label: string) {
  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    fail(`Invalid ${label}.`);
  }
}

function fail(message: string): never {
  throw new BillingCatalogDefinitionError(message);
}

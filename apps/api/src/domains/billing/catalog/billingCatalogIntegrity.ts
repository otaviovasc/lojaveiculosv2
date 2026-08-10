import { createHash } from "node:crypto";
import {
  billingCatalogFeatureKeys,
  type BillingCatalogDefinition,
} from "./billingCatalogDefinition.js";

export class BillingCatalogDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingCatalogDefinitionError";
  }
}

export class BillingCatalogImmutableVersionError extends Error {
  constructor(version: string) {
    super(
      `Billing catalog ${version} is immutable and differs from the deployed definition. Create a new catalog version.`,
    );
    this.name = "BillingCatalogImmutableVersionError";
  }
}

export class BillingCatalogActivationAuditInProgressError extends Error {
  constructor(version: string) {
    super(
      `Billing catalog ${version} activation audit is still pending; retry deployment reconciliation.`,
    );
    this.name = "BillingCatalogActivationAuditInProgressError";
  }
}

export class BillingCatalogNotPublishedError extends Error {
  constructor(version: string, publishedAt: string) {
    super(
      `Billing catalog ${version} cannot be activated before ${publishedAt}.`,
    );
    this.name = "BillingCatalogNotPublishedError";
  }
}

export class BillingCatalogReactivationError extends Error {
  constructor(version: string) {
    super(
      `Billing catalog ${version} was superseded and cannot be reactivated. Publish a new immutable version instead.`,
    );
    this.name = "BillingCatalogReactivationError";
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

  for (const plan of catalog.plans) {
    assertUuid(plan.id, `plan ${plan.code}`);
    assertPrice(plan.monthlyPriceCents, `plan ${plan.code}`);
    assertPositiveInteger(plan.limits.sellerLimit, `${plan.code}.sellerLimit`);
    assertPositiveInteger(
      plan.limits.vehicleLimit,
      `${plan.code}.vehicleLimit`,
    );
    assertCompleteFeatures(plan.code, plan.features);
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

export function assertBillingCatalogIsPublished(
  catalog: BillingCatalogDefinition,
  now: Date,
): void {
  if (Date.parse(catalog.publishedAt) > now.getTime()) {
    throw new BillingCatalogNotPublishedError(
      catalog.version,
      catalog.publishedAt,
    );
  }
}

export function billingCatalogChecksum(
  catalog: BillingCatalogDefinition,
): string {
  return createHash("sha256")
    .update(canonicalBillingCatalogJson(catalog))
    .digest("hex");
}

export function billingCatalogActivationAuditId(version: string): string {
  const hash = createHash("sha256")
    .update(`billing.catalog.activated:${version}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function canonicalBillingCatalogJson(
  catalog: BillingCatalogDefinition,
): string {
  return stableJson({
    ...catalog,
    addons: [...catalog.addons].sort(byCode),
    plans: [...catalog.plans].sort(byCode).map((plan) => ({
      ...plan,
      features: [...plan.features].sort((left, right) =>
        left.featureKey.localeCompare(right.featureKey),
      ),
    })),
  });
}

function assertCompleteFeatures(
  planCode: string,
  features: BillingCatalogDefinition["plans"][number]["features"],
) {
  assertUnique(
    features.map((feature) => feature.featureKey),
    `feature in plan ${planCode}`,
  );
  const actual = new Set(features.map((feature) => feature.featureKey));
  const missing = billingCatalogFeatureKeys.filter((key) => !actual.has(key));
  if (missing.length || actual.size !== billingCatalogFeatureKeys.length) {
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

function assertNullableNonNegativeInteger(value: number | null, label: string) {
  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    fail(`Invalid ${label}.`);
  }
}

function byCode(left: { code: string }, right: { code: string }) {
  return left.code.localeCompare(right.code);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function fail(message: string): never {
  throw new BillingCatalogDefinitionError(message);
}

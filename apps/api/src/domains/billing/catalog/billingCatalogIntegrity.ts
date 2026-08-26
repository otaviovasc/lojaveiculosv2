import { createHash } from "node:crypto";
import type { BillingCatalogDefinition } from "./billingCatalogDefinition.js";
import {
  assertValidBillingCatalog,
  BillingCatalogDefinitionError,
} from "./billingCatalogIntegrityValidation.js";

export { assertValidBillingCatalog, BillingCatalogDefinitionError };

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

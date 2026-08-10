import {
  addons,
  billingCatalogVersions,
  planFeatures,
  plans,
} from "@lojaveiculosv2/db";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  BillingCatalogActivationAuditInProgressError,
  BillingCatalogImmutableVersionError,
  BillingCatalogReactivationError,
  billingCatalogChecksum,
  canonicalBillingCatalogJson,
} from "../../../domains/billing/catalog/billingCatalogIntegrity.js";
import type { BillingCatalogDeploymentRepository } from "../../../domains/billing/ports/billingCatalogDeployment.js";
import {
  claimCatalogActivationAudit,
  markCatalogActivationAudited,
  releaseCatalogActivationAuditClaim,
} from "./drizzleBillingCatalogActivationAudit.js";
import {
  loadPersistedBillingCatalog,
  toDatabaseAddonLimits,
  type BillingCatalogDeploymentClient,
  type BillingCatalogVersionRow,
} from "./drizzleBillingCatalogDeploymentMapping.js";

const advisoryLockName = "lojaveiculosv2.billing_catalog_deploy";

export function createDrizzleBillingCatalogDeploymentRepository(
  db: BillingCatalogDeploymentClient,
): BillingCatalogDeploymentRepository {
  return {
    markActivationAudited: (input) => markCatalogActivationAudited(db, input),
    reconcile(input) {
      return db.transaction(async (transaction) => {
        const tx = transaction as BillingCatalogDeploymentClient;
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${advisoryLockName}))`,
        );
        const existing = await findVersion(tx, input.catalog.version);
        if (existing) return reconcileExisting(tx, existing, input);
        return installAndActivate(tx, input);
      });
    },
    releaseActivationAuditClaim: (input) =>
      releaseCatalogActivationAuditClaim(db, input),
  };
}

async function reconcileExisting(
  db: BillingCatalogDeploymentClient,
  existing: BillingCatalogVersionRow,
  input: Parameters<BillingCatalogDeploymentRepository["reconcile"]>[0],
) {
  if (
    existing.checksum !== input.checksum ||
    canonicalBillingCatalogJson(
      existing.definition as Parameters<typeof canonicalBillingCatalogJson>[0],
    ) !== canonicalBillingCatalogJson(input.catalog)
  ) {
    throw new BillingCatalogImmutableVersionError(input.catalog.version);
  }
  await assertPersistedCatalogMatches(db, existing, input.checksum);
  if (existing.status === "superseded") {
    throw new BillingCatalogReactivationError(existing.version);
  }
  if (existing.status === "staged") {
    return activate(db, existing, input);
  }
  return claimCatalogActivationAudit(db, existing, input, {
    activated: false,
    checksum: existing.checksum,
    previousVersion: existing.previousVersion,
    version: existing.version,
  });
}

async function installAndActivate(
  db: BillingCatalogDeploymentClient,
  input: Parameters<BillingCatalogDeploymentRepository["reconcile"]>[0],
) {
  const publishedAt = new Date(input.catalog.publishedAt);
  const [versionRow] = await db
    .insert(billingCatalogVersions)
    .values({
      checksum: input.checksum,
      definition: JSON.parse(canonicalBillingCatalogJson(input.catalog)),
      publishedAt,
      status: "staged",
      version: input.catalog.version,
    })
    .returning();
  if (!versionRow) throw new Error("Billing catalog version insert failed.");

  await db.insert(plans).values(
    input.catalog.plans.map((plan) => ({
      catalogVersion: input.catalog.version,
      code: plan.code,
      id: plan.id,
      isDefault: plan.isDefault,
      limits: {
        seller_limit: plan.limits.sellerLimit,
        vehicle_limit: plan.limits.vehicleLimit,
      },
      monthlyPriceCents: plan.monthlyPriceCents,
      name: plan.name,
      publishedAt,
      status: plan.status,
    })),
  );
  await db.insert(planFeatures).values(
    input.catalog.plans.flatMap((plan) =>
      plan.features.map((feature) => ({
        featureKey: feature.featureKey,
        included: feature.included ? 1 : 0,
        includedInTrial: feature.includedInTrial,
        limitValue: feature.limitValue,
        planId: plan.id,
        trialLimitValue: feature.trialLimitValue,
      })),
    ),
  );
  await db.insert(addons).values(
    input.catalog.addons.map((addon) => ({
      catalogVersion: input.catalog.version,
      code: addon.code,
      featureKey: addon.featureKey,
      id: addon.id,
      includedInTrial: addon.includedInTrial,
      limits: toDatabaseAddonLimits(addon.limits),
      monthlyPriceCents: addon.monthlyPriceCents,
      name: addon.name,
      publishedAt,
      status: addon.status,
    })),
  );
  await assertPersistedCatalogMatches(db, versionRow, input.checksum);
  return activate(db, versionRow, input);
}

async function activate(
  db: BillingCatalogDeploymentClient,
  versionRow: BillingCatalogVersionRow,
  input: Parameters<BillingCatalogDeploymentRepository["reconcile"]>[0],
) {
  const { now } = input;
  const [active] = await db
    .select()
    .from(billingCatalogVersions)
    .where(eq(billingCatalogVersions.status, "active"))
    .limit(1);
  if (
    active &&
    active.activationAuditRecordedAt === null &&
    !isLegacyCatalogSnapshot(active.definition)
  ) {
    throw new BillingCatalogActivationAuditInProgressError(active.version);
  }
  const previousVersion = active?.version ?? null;
  await db
    .update(billingCatalogVersions)
    .set({ status: "superseded", updatedAt: now })
    .where(
      and(
        eq(billingCatalogVersions.status, "active"),
        ne(billingCatalogVersions.version, versionRow.version),
      ),
    );
  await db
    .update(billingCatalogVersions)
    .set({
      activatedAt: now,
      activationAuditClaimedAt: null,
      activationAuditClaimToken: null,
      activationAuditRecordedAt: null,
      previousVersion,
      status: "active",
      updatedAt: now,
    })
    .where(eq(billingCatalogVersions.version, versionRow.version));
  return claimCatalogActivationAudit(db, versionRow, input, {
    activated: true,
    checksum: versionRow.checksum,
    previousVersion,
    version: versionRow.version,
  });
}

function isLegacyCatalogSnapshot(definition: unknown): boolean {
  return (
    definition !== null &&
    typeof definition === "object" &&
    "kind" in definition &&
    definition.kind === "legacy_relational_snapshot"
  );
}

async function assertPersistedCatalogMatches(
  db: BillingCatalogDeploymentClient,
  versionRow: BillingCatalogVersionRow,
  expectedChecksum: string,
) {
  const persisted = await loadPersistedBillingCatalog(db, versionRow);
  if (billingCatalogChecksum(persisted) !== expectedChecksum) {
    throw new BillingCatalogImmutableVersionError(versionRow.version);
  }
}

async function findVersion(
  db: BillingCatalogDeploymentClient,
  version: string,
) {
  const [row] = await db
    .select()
    .from(billingCatalogVersions)
    .where(eq(billingCatalogVersions.version, version))
    .limit(1);
  return row;
}

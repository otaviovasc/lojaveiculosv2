import { billingCatalogVersions } from "@lojaveiculosv2/db";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { BillingCatalogDeploymentRepository } from "../../../domains/billing/ports/billingCatalogDeployment.js";
import type {
  BillingCatalogDeploymentClient,
  BillingCatalogVersionRow,
} from "./drizzleBillingCatalogDeploymentMapping.js";

const activationAuditClaimLeaseMs = 5 * 60 * 1_000;

type AuditMutationInput = Parameters<
  BillingCatalogDeploymentRepository["markActivationAudited"]
>[0];
type ReconcileInput = Parameters<
  BillingCatalogDeploymentRepository["reconcile"]
>[0];
type ReconcileResultWithoutAudit = Omit<
  Awaited<ReturnType<BillingCatalogDeploymentRepository["reconcile"]>>,
  | "activationAuditBlocked"
  | "activationAuditClaimToken"
  | "activationAuditPending"
>;

export async function markCatalogActivationAudited(
  db: BillingCatalogDeploymentClient,
  input: AuditMutationInput,
): Promise<void> {
  const rows = await db
    .update(billingCatalogVersions)
    .set({
      activationAuditClaimedAt: null,
      activationAuditClaimToken: null,
      activationAuditRecordedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(claimMatches(input))
    .returning({ version: billingCatalogVersions.version });
  if (rows.length !== 1) {
    throw new Error(
      `Could not mark billing catalog ${input.version} activation as audited.`,
    );
  }
}

export async function releaseCatalogActivationAuditClaim(
  db: BillingCatalogDeploymentClient,
  input: AuditMutationInput,
): Promise<void> {
  await db
    .update(billingCatalogVersions)
    .set({
      activationAuditClaimedAt: null,
      activationAuditClaimToken: null,
      updatedAt: new Date(),
    })
    .where(claimMatches(input));
}

export async function claimCatalogActivationAudit(
  db: BillingCatalogDeploymentClient,
  versionRow: BillingCatalogVersionRow,
  input: ReconcileInput,
  result: ReconcileResultWithoutAudit,
) {
  if (versionRow.activationAuditRecordedAt !== null) {
    return {
      ...result,
      activationAuditBlocked: false,
      activationAuditClaimToken: null,
      activationAuditPending: false,
    };
  }
  const leaseExpiredAt = new Date(
    input.now.getTime() - activationAuditClaimLeaseMs,
  );
  const claimed = await db
    .update(billingCatalogVersions)
    .set({
      activationAuditClaimedAt: input.now,
      activationAuditClaimToken: input.auditClaimToken,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(billingCatalogVersions.version, versionRow.version),
        eq(billingCatalogVersions.checksum, result.checksum),
        eq(billingCatalogVersions.status, "active"),
        isNull(billingCatalogVersions.activationAuditRecordedAt),
        or(
          isNull(billingCatalogVersions.activationAuditClaimedAt),
          lt(billingCatalogVersions.activationAuditClaimedAt, leaseExpiredAt),
        ),
      ),
    )
    .returning({ version: billingCatalogVersions.version });
  const ownsClaim = claimed.length === 1;
  return {
    ...result,
    activationAuditBlocked: !ownsClaim,
    activationAuditClaimToken: ownsClaim ? input.auditClaimToken : null,
    activationAuditPending: ownsClaim,
  };
}

function claimMatches(input: AuditMutationInput) {
  return and(
    eq(billingCatalogVersions.version, input.version),
    eq(billingCatalogVersions.checksum, input.checksum),
    eq(billingCatalogVersions.status, "active"),
    eq(billingCatalogVersions.activationAuditClaimToken, input.claimToken),
    isNull(billingCatalogVersions.activationAuditRecordedAt),
  );
}

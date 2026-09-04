import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import {
  BillingCatalogActivationAuditInProgressError,
  assertBillingCatalogIsPublished,
  assertValidBillingCatalog,
  billingCatalogActivationAuditId,
  billingCatalogChecksum,
} from "../../catalog/billingCatalogIntegrity.js";
import type { BillingCatalogDefinition } from "../../catalog/billingCatalogDefinition.js";
import type { BillingCatalogDeploymentRepository } from "../../ports/billingCatalogDeployment.js";

const reconcilePermission = "billing.catalog.deploy";

export class BillingCatalogDeploymentAuthorizationError extends Error {
  constructor() {
    super("Billing catalog deployment requires an authorized system actor.");
    this.name = "BillingCatalogDeploymentAuthorizationError";
  }
}

export async function reconcileBillingCatalog(
  context: ServiceContext,
  input: { catalog: BillingCatalogDefinition; now?: Date },
  ports: { catalogDeploymentRepository: BillingCatalogDeploymentRepository },
) {
  assertAuthorized(context);
  assertValidBillingCatalog(input.catalog);
  const now = input.now ?? new Date();
  assertBillingCatalogIsPublished(input.catalog, now);
  const checksum = billingCatalogChecksum(input.catalog);
  const result = await ports.catalogDeploymentRepository.reconcile({
    auditClaimToken: context.requestId,
    catalog: input.catalog,
    checksum,
    now,
  });

  if (result.activationAuditBlocked) {
    throw new BillingCatalogActivationAuditInProgressError(result.version);
  }

  if (result.activationAuditPending && result.activationAuditClaimToken) {
    try {
      await context.audit.record({
        action: "billing.catalog.activated",
        actor: context.actor,
        category: "system",
        changes: [
          { before: result.previousVersion, path: "activeCatalogVersion" },
          { after: result.version, path: "activeCatalogVersion" },
        ],
        criticality: "critical",
        dataClassification: "internal",
        entityId: result.version,
        entityType: "billing_catalog_version",
        failureTier: "required",
        id: billingCatalogActivationAuditId(result.version),
        metadata: {
          addonCount: input.catalog.addons.length,
          checksum: result.checksum,
          planCount: input.catalog.plans.length,
        },
        outcome: "succeeded",
        requestId: context.requestId,
        severity: "info",
        storeId: null,
        summary: `Activated immutable billing catalog ${result.version}.`,
        tenantId: null,
      });
      await ports.catalogDeploymentRepository.markActivationAudited({
        claimToken: result.activationAuditClaimToken,
        checksum: result.checksum,
        version: result.version,
      });
    } catch (error) {
      await ports.catalogDeploymentRepository.releaseActivationAuditClaim({
        claimToken: result.activationAuditClaimToken,
        checksum: result.checksum,
        version: result.version,
      });
      throw error;
    }
  }

  context.logger.info(
    result.activated
      ? "billing.catalog.activated"
      : "billing.catalog.reconcile_noop",
    createServiceLogMetadata(context, {
      activationAuditPending: result.activationAuditPending,
      addonCount: input.catalog.addons.length,
      catalogChecksum: result.checksum,
      catalogVersion: result.version,
      planCount: input.catalog.plans.length,
      previousCatalogVersion: result.previousVersion,
    }),
  );
  return result;
}

function assertAuthorized(context: ServiceContext) {
  assertPermission(context, reconcilePermission);
  if (context.actor.kind !== "system") {
    context.logger.warn(
      "authorization.billing_catalog_deploy.denied",
      createServiceLogMetadata(context),
    );
    throw new BillingCatalogDeploymentAuthorizationError();
  }
}

import type { BillingCatalogDefinition } from "../catalog/billingCatalogDefinition.js";

export type BillingCatalogDeploymentResult = {
  activationAuditBlocked: boolean;
  activationAuditClaimToken: string | null;
  activationAuditPending: boolean;
  activated: boolean;
  checksum: string;
  previousVersion: string | null;
  version: string;
};

export type BillingCatalogDeploymentRepository = {
  markActivationAudited: (input: {
    claimToken: string;
    checksum: string;
    version: string;
  }) => Promise<void>;
  releaseActivationAuditClaim: (input: {
    claimToken: string;
    checksum: string;
    version: string;
  }) => Promise<void>;
  reconcile: (input: {
    auditClaimToken: string;
    catalog: BillingCatalogDefinition;
    checksum: string;
    now: Date;
  }) => Promise<BillingCatalogDeploymentResult>;
};

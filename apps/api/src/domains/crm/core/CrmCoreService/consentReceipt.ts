import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmCoreRepository } from "../../ports/crmCoreRepository.js";
import { CrmCoreNotFoundError, CrmCoreRuleError } from "../errors.js";
import type { Consent, CrmAcquisitionSource, CrmChannel } from "../models.js";
import {
  auditCoreMutation,
  authorizeCorePermission,
} from "./serviceSupport.js";

export async function recordConsentReceipt(
  context: ServiceContext,
  input: {
    channel: CrmChannel;
    contactId: string;
    evidence: string;
    identityId: string | null;
    occurredAt: Date;
    policyVersion: string;
    purpose: string;
    source: CrmAcquisitionSource;
    status: Consent["status"];
  },
  repository: CrmCoreRepository,
): Promise<Consent> {
  if (
    !input.evidence.trim() ||
    !input.policyVersion.trim() ||
    !input.purpose.trim() ||
    Number.isNaN(input.occurredAt.getTime())
  ) {
    throw new CrmCoreRuleError(
      "Consent requires valid purpose, evidence, occurrence time, and policy version.",
      "CRM_CONSENT_EVIDENCE_REQUIRED",
    );
  }
  const scope = authorizeCorePermission(context, "crm.consent.record");
  const contact = await repository.get({
    ...scope,
    id: input.contactId,
    resource: "contacts",
  });
  if (!contact) throw new CrmCoreNotFoundError("contacts", input.contactId);
  if (contact.mergedIntoContactId) {
    throw new CrmCoreRuleError(
      "Consent must reference the active contact after a merge.",
      "CRM_CONSENT_CONTACT_MERGED",
    );
  }
  if (input.identityId) {
    const identity = await repository.get({
      ...scope,
      id: input.identityId,
      resource: "contact-identities",
    });
    if (!identity || identity.contactId !== input.contactId) {
      throw new CrmCoreRuleError(
        "Consent identity must be verified for the same scoped contact.",
        "CRM_CONSENT_IDENTITY_INVALID",
      );
    }
    if (identity.verification !== "verified") {
      throw new CrmCoreRuleError(
        "Consent identity must be verified for the same scoped contact.",
        "CRM_CONSENT_IDENTITY_INVALID",
      );
    }
  }
  const receipt = await repository.create({
    data: input,
    resource: "consents",
    scope,
  });
  await auditCoreMutation(context, {
    action: "crm.core.consent.record",
    entityId: receipt.id,
    entityType: "consent_receipt",
    metadata: {
      channel: receipt.channel,
      evidenceCaptured: true,
      occurredAt: receipt.occurredAt.toISOString(),
      policyVersion: receipt.policyVersion,
      purpose: receipt.purpose,
      source: receipt.source,
      status: receipt.status,
    },
    permission: "crm.consent.record",
  });
  return receipt;
}

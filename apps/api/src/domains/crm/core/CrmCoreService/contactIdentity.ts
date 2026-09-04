import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmCoreRepository } from "../../ports/crmCoreRepository.js";
import { CrmCoreNotFoundError, CrmCoreRuleError } from "../errors.js";
import type { ContactIdentity } from "../models.js";
import { normalizeContactIdentity } from "../normalizeIdentity.js";
import {
  auditCoreMutation,
  authorizeCoreMutation,
  authorizeCorePermission,
} from "./serviceSupport.js";

export async function createContactIdentity(
  context: ServiceContext,
  input: {
    contactId?: string | null;
    kind: ContactIdentity["kind"];
    value: string;
  },
  repository: CrmCoreRepository,
): Promise<ContactIdentity> {
  const scope = authorizeCoreMutation(context);
  const normalizedValue = normalizeContactIdentity(input.kind, input.value);
  if (!normalizedValue) {
    throw new CrmCoreRuleError(
      "Identity value is invalid.",
      "CRM_IDENTITY_INVALID",
    );
  }
  const matches = await repository.findIdentityByNormalizedValue({
    ...scope,
    kind: input.kind,
    normalizedValue,
  });
  if (input.contactId) {
    await requireActiveContact(scope, input.contactId, repository);
  }
  const confirmedContactIds = [
    ...new Set(
      matches
        .filter((item) => item.verification === "verified" && item.contactId)
        .map((item) => item.contactId as string),
    ),
  ];
  const requestedContactId = input.contactId ?? null;
  const autoContactId =
    confirmedContactIds.length === 1 ? (confirmedContactIds[0] ?? null) : null;
  const identity = await repository.create({
    data: {
      candidateContactIds: autoContactId
        ? []
        : [
            ...new Set([
              ...confirmedContactIds,
              ...(requestedContactId ? [requestedContactId] : []),
            ]),
          ],
      contactId: autoContactId,
      kind: input.kind,
      normalizedValue,
      verification: requestedContactId ? "candidate" : "observed",
    },
    resource: "contact-identities",
    scope,
  });
  await auditCoreMutation(context, {
    action: "crm.core.contact_identity.create",
    entityId: identity.id,
    entityType: "contact_identity",
  });
  return identity;
}

export async function verifyContactIdentity(
  context: ServiceContext,
  input: IdentityDecisionInput,
  repository: CrmCoreRepository,
): Promise<ContactIdentity> {
  assertDecisionEvidence(input);
  const scope = authorizeCorePermission(context, "crm.contact_identity.verify");
  const current = await repository.get({
    ...scope,
    id: input.identityId,
    resource: "contact-identities",
  });
  if (!current)
    throw new CrmCoreNotFoundError("contact-identities", input.identityId);
  if (current.verification === "superseded") {
    throw new CrmCoreRuleError(
      "A superseded identity cannot be verified.",
      "CRM_IDENTITY_SUPERSEDED",
    );
  }
  const contactId = input.contactId ?? current.contactId;
  if (!contactId) {
    throw new CrmCoreRuleError(
      "Identity verification requires a scoped contact.",
      "CRM_IDENTITY_CONTACT_REQUIRED",
    );
  }
  await requireActiveContact(scope, contactId, repository);
  const matches = await repository.findIdentityByNormalizedValue({
    ...scope,
    kind: current.kind,
    normalizedValue: current.normalizedValue,
  });
  const collides = matches.some(
    (identity) =>
      identity.id !== current.id &&
      identity.verification === "verified" &&
      identity.contactId !== contactId,
  );
  const identity = await repository.update({
    ...scope,
    expectedRevision: input.expectedRevision,
    id: current.id,
    patch: collides
      ? {
          candidateContactIds: [
            ...new Set([
              ...current.candidateContactIds,
              contactId,
              ...matches.flatMap((identity) =>
                identity.contactId ? [identity.contactId] : [],
              ),
            ]),
          ],
          contactId: null,
          verification: "disputed",
        }
      : { contactId, verification: "verified" },
    resource: "contact-identities",
  });
  if (!identity)
    throw new CrmCoreNotFoundError("contact-identities", current.id);
  await auditIdentityDecision(
    context,
    identity,
    collides ? "dispute" : "verify",
    input,
  );
  return identity;
}

export async function disputeContactIdentity(
  context: ServiceContext,
  input: IdentityDecisionInput,
  repository: CrmCoreRepository,
): Promise<ContactIdentity> {
  assertDecisionEvidence(input);
  const scope = authorizeCorePermission(
    context,
    "crm.contact_identity.dispute",
  );
  const identity = await repository.update({
    ...scope,
    expectedRevision: input.expectedRevision,
    id: input.identityId,
    patch: { contactId: null, verification: "disputed" },
    resource: "contact-identities",
  });
  if (!identity)
    throw new CrmCoreNotFoundError("contact-identities", input.identityId);
  await auditIdentityDecision(context, identity, "dispute", input);
  return identity;
}

type IdentityDecisionInput = {
  contactId?: string;
  evidence: string;
  expectedRevision: number;
  identityId: string;
  occurredAt: Date;
  source: string;
};

function assertDecisionEvidence(input: IdentityDecisionInput): void {
  if (
    !input.evidence.trim() ||
    !input.source.trim() ||
    Number.isNaN(input.occurredAt.getTime())
  ) {
    throw new CrmCoreRuleError(
      "Identity decisions require valid evidence, source, and occurrence time.",
      "CRM_IDENTITY_EVIDENCE_REQUIRED",
    );
  }
}

async function requireActiveContact(
  scope: { storeId: string; tenantId: string },
  contactId: string,
  repository: CrmCoreRepository,
): Promise<void> {
  const contact = await repository.get({
    ...scope,
    id: contactId,
    resource: "contacts",
  });
  if (!contact) throw new CrmCoreNotFoundError("contacts", contactId);
  if (contact.mergedIntoContactId) {
    throw new CrmCoreRuleError(
      "Identity must reference the active contact after a merge.",
      "CRM_IDENTITY_CONTACT_MERGED",
    );
  }
}

async function auditIdentityDecision(
  context: ServiceContext,
  identity: ContactIdentity,
  decision: "dispute" | "verify",
  input: IdentityDecisionInput,
): Promise<void> {
  const permission =
    decision === "verify"
      ? "crm.contact_identity.verify"
      : "crm.contact_identity.dispute";
  await auditCoreMutation(context, {
    action: `crm.core.contact_identity.${decision}`,
    entityId: identity.id,
    entityType: "contact_identity",
    metadata: {
      evidenceCaptured: input.evidence.length > 0,
      evidenceSource: input.source,
      occurredAt: input.occurredAt.toISOString(),
    },
    permission,
  });
}

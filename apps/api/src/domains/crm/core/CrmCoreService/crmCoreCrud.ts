import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmCoreRepository } from "../../ports/crmCoreRepository.js";
import { CrmCoreNotFoundError, CrmCoreRuleError } from "../errors.js";
import type {
  CrmCoreEntityByResource,
  CrmCoreResource,
  CreateCrmCoreEntity,
} from "../models.js";
import {
  auditCoreMutation,
  authorizeCoreMutation,
  authorizeCoreRead,
} from "./serviceSupport.js";
import { decodeCrmCoreCursor, encodeCrmCoreCursor } from "./pagination.js";

export async function listCrmCore<R extends CrmCoreResource>(
  context: ServiceContext,
  resource: R,
  repository: CrmCoreRepository,
  pagination: { cursor?: string; limit: number } = { limit: 50 },
): Promise<{
  items: readonly CrmCoreEntityByResource[R][];
  nextCursor: string | null;
}> {
  const cursor = decodeCrmCoreCursor(pagination.cursor);
  const rows = await repository.list({
    ...authorizeCoreRead(context),
    ...(cursor ? { cursor } : {}),
    limit: pagination.limit + 1,
    resource,
  });
  const items = rows.slice(0, pagination.limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > pagination.limit && last ? encodeCrmCoreCursor(last) : null,
  };
}

export async function createCrmCore<R extends CrmCoreResource>(
  context: ServiceContext,
  resource: R,
  data: CreateCrmCoreEntity<R>,
  repository: CrmCoreRepository,
): Promise<CrmCoreEntityByResource[R]> {
  const scope = authorizeCoreMutation(context);
  assertCreateRules(resource, data);
  if (resource === "opportunities") {
    const contactId = (data as unknown as { contactId: string }).contactId;
    const contact = await repository.get({
      ...scope,
      id: contactId,
      resource: "contacts",
    });
    if (!contact) throw new CrmCoreNotFoundError("contacts", contactId);
    if (contact.mergedIntoContactId) {
      throw new CrmCoreRuleError(
        "Opportunity must reference the active contact after a merge.",
        "CRM_OPPORTUNITY_CONTACT_MERGED",
      );
    }
  }
  const entity = await repository.create({ data, resource, scope });
  await auditCoreMutation(context, {
    action: `crm.core.${resource}.create`,
    entityId: entity.id,
    entityType: resource,
  });
  return entity;
}

export async function updateCrmCore<R extends CrmCoreResource>(
  context: ServiceContext,
  input: {
    expectedRevision: number;
    id: string;
    patch: Partial<CreateCrmCoreEntity<R>>;
    resource: R;
  },
  repository: CrmCoreRepository,
): Promise<CrmCoreEntityByResource[R]> {
  const scope = authorizeCoreMutation(context);
  assertAllowedPatch(input.resource, input.patch);
  const entity = await repository.update({ ...scope, ...input });
  if (!entity) throw new CrmCoreNotFoundError(input.resource, input.id);
  await auditCoreMutation(context, {
    action: `crm.core.${input.resource}.update`,
    entityId: entity.id,
    entityType: input.resource,
  });
  return entity;
}

function assertCreateRules<R extends CrmCoreResource>(
  resource: R,
  data: CreateCrmCoreEntity<R>,
): void {
  if (
    resource === "opportunities" &&
    (data as { commercialIntentConfirmed?: boolean })
      .commercialIntentConfirmed !== true
  ) {
    throw new CrmCoreRuleError(
      "Opportunity requires confirmed commercial intent.",
      "CRM_COMMERCIAL_INTENT_REQUIRED",
    );
  }
}

function assertAllowedPatch<R extends CrmCoreResource>(
  resource: R,
  patch: Partial<CreateCrmCoreEntity<R>>,
): void {
  const allowedByResource: Record<CrmCoreResource, readonly string[]> = {
    connections: [],
    consents: [],
    "contact-identities": [],
    contacts: ["displayName"],
    conversations: [
      "attendanceState",
      "pipelineId",
      "pipelineStageId",
      "threadState",
      "unreadCount",
    ],
    "fact-proposals": [],
    opportunities: ["interests", "pipelineId", "pipelineStageId", "status"],
  };
  const unexpected = Object.keys(patch).filter(
    (key) => !allowedByResource[resource].includes(key),
  );
  if (unexpected.length > 0) {
    throw new CrmCoreRuleError(
      `Fields cannot be mutated through the ${resource} update contract: ${unexpected.join(", ")}.`,
      "CRM_CORE_FIELD_IMMUTABLE",
    );
  }
}

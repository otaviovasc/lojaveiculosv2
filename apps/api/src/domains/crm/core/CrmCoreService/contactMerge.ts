import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmCoreRepository } from "../../ports/crmCoreRepository.js";
import { CrmCoreNotFoundError, CrmCoreRuleError } from "../errors.js";
import type { Contact } from "../models.js";
import {
  auditCoreMutation,
  authorizeCorePermission,
} from "./serviceSupport.js";

export async function mergeContact(
  context: ServiceContext,
  input: {
    expectedRevision: number;
    sourceContactId: string;
    targetContactId: string;
  },
  repository: CrmCoreRepository,
): Promise<Contact> {
  if (input.sourceContactId === input.targetContactId) {
    throw new CrmCoreRuleError(
      "A contact cannot be merged into itself.",
      "CRM_CONTACT_MERGE_INVALID",
    );
  }
  const scope = authorizeCorePermission(context, "crm.contact.merge");
  const target = await repository.get({
    ...scope,
    id: input.targetContactId,
    resource: "contacts",
  });
  if (!target)
    throw new CrmCoreNotFoundError("contacts", input.targetContactId);
  const source = await repository.update({
    ...scope,
    expectedRevision: input.expectedRevision,
    id: input.sourceContactId,
    patch: { mergedIntoContactId: target.id },
    resource: "contacts",
  });
  if (!source)
    throw new CrmCoreNotFoundError("contacts", input.sourceContactId);
  await auditCoreMutation(context, {
    action: "crm.core.contact.merge",
    entityId: source.id,
    entityType: "contact",
    permission: "crm.contact.merge",
  });
  return source;
}

export async function unmergeContact(
  context: ServiceContext,
  input: { contactId: string; expectedRevision: number },
  repository: CrmCoreRepository,
): Promise<Contact> {
  const scope = authorizeCorePermission(context, "crm.contact.merge");
  const contact = await repository.update({
    ...scope,
    expectedRevision: input.expectedRevision,
    id: input.contactId,
    patch: { mergedIntoContactId: null },
    resource: "contacts",
  });
  if (!contact) throw new CrmCoreNotFoundError("contacts", input.contactId);
  await auditCoreMutation(context, {
    action: "crm.core.contact.unmerge",
    entityId: contact.id,
    entityType: "contact",
    permission: "crm.contact.merge",
  });
  return contact;
}

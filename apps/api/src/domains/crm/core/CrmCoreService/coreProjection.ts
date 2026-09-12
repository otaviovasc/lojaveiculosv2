import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmCoreEntityByResource, CrmCoreResource } from "../models.js";

export type CrmCoreProjection<R extends CrmCoreResource> =
  CrmCoreEntityByResource[R] & {
    allowedNextActions: readonly string[];
    requestId: string;
  };

export function projectCrmCore<R extends CrmCoreResource>(
  context: ServiceContext,
  resource: R,
  entity: CrmCoreEntityByResource[R],
): CrmCoreProjection<R> {
  const allowedNextActions: string[] = [];
  if (resource === "contacts") {
    const contact = entity as CrmCoreEntityByResource["contacts"];
    if (context.permissions.includes("crm.manage")) {
      allowedNextActions.push("update");
    }
    if (context.permissions.includes("crm.contact.merge")) {
      allowedNextActions.push(
        contact.mergedIntoContactId ? "unmerge" : "merge",
      );
    }
  }
  if (context.permissions.includes("crm.manage")) {
    if (resource === "opportunities") allowedNextActions.push("update");
    if (resource === "connections") {
      const connection = entity as CrmCoreEntityByResource["connections"];
      if (
        connection.operational &&
        !connection.degraded &&
        connection.capabilities.outbound
      ) {
        allowedNextActions.push("start_conversation");
      }
      if (!connection.operational || connection.degraded)
        allowedNextActions.push("reconnect");
    }
  }
  if (resource === "contact-identities") {
    const identity = entity as CrmCoreEntityByResource["contact-identities"];
    if (
      identity.verification !== "superseded" &&
      context.permissions.includes("crm.contact_identity.verify")
    ) {
      allowedNextActions.push("verify");
    }
    if (
      identity.verification !== "superseded" &&
      context.permissions.includes("crm.contact_identity.dispute")
    ) {
      allowedNextActions.push("dispute");
    }
  }
  return { ...entity, allowedNextActions, requestId: context.requestId };
}

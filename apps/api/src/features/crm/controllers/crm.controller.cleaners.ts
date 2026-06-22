import type { z } from "zod";
import type { CreateCrmLeadInput } from "../../../domains/crm/services/CrmService/createCrmLead.js";
import type { CreateLeadActivityInput } from "../../../domains/crm/services/CrmService/createLeadActivity.js";
import type { ListCrmLeadsInput } from "../../../domains/crm/services/CrmService/listCrmLeads.js";
import type { UpdateCrmLeadInput } from "../../../domains/crm/services/CrmService/updateCrmLead.js";
import type {
  createActivitySchema,
  createLeadSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from "./crm.controller.schemas.js";

export function cleanListLeadsInput(
  input: z.infer<typeof listLeadsQuerySchema>,
): ListCrmLeadsInput {
  return {
    ...(input.listingId ? { listingId: input.listingId } : {}),
    limit: input.limit,
    ...(input.search ? { search: input.search } : {}),
    ...(input.source ? { source: input.source } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}

export function cleanCreateLeadInput(
  input: z.infer<typeof createLeadSchema>,
): CreateCrmLeadInput {
  return {
    ...(input.assignedUserId !== undefined
      ? { assignedUserId: input.assignedUserId }
      : {}),
    ...(input.buyerEmail !== undefined ? { buyerEmail: input.buyerEmail } : {}),
    ...(input.buyerName !== undefined ? { buyerName: input.buyerName } : {}),
    ...(input.buyerPhone !== undefined ? { buyerPhone: input.buyerPhone } : {}),
    ...(input.listingId !== undefined ? { listingId: input.listingId } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    source: input.source,
  };
}

export function cleanUpdateLeadInput(
  input: z.infer<typeof updateLeadSchema>,
): Omit<UpdateCrmLeadInput, "leadId"> {
  return {
    ...(input.assignedUserId !== undefined
      ? { assignedUserId: input.assignedUserId }
      : {}),
    ...(input.buyerEmail !== undefined ? { buyerEmail: input.buyerEmail } : {}),
    ...(input.buyerName !== undefined ? { buyerName: input.buyerName } : {}),
    ...(input.buyerPhone !== undefined ? { buyerPhone: input.buyerPhone } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}

export function cleanCreateActivityInput(
  leadId: string,
  input: z.infer<typeof createActivitySchema>,
): CreateLeadActivityInput {
  return {
    activityType: input.activityType,
    content: input.content,
    direction: input.direction,
    leadId,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.occurredAt ? { occurredAt: new Date(input.occurredAt) } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
  };
}

import type { z } from "zod";
import type { CreateCrmLeadInput } from "../../../domains/crm/services/CrmService/createCrmLead.js";
import type { CreateLeadActivityInput } from "../../../domains/crm/services/CrmService/createLeadActivity.js";
import type { CreateCrmPipelineInput } from "../../../domains/crm/services/CrmService/createCrmPipeline.js";
import type { ListCrmLeadsInput } from "../../../domains/crm/services/CrmService/listCrmLeads.js";
import type { UpdateCrmPipelineInput } from "../../../domains/crm/services/CrmService/updateCrmPipeline.js";
import type { UpdateCrmLeadInput } from "../../../domains/crm/services/CrmService/updateCrmLead.js";
import type {
  createActivitySchema,
  createLeadSchema,
  createPipelineSchema,
  listLeadsQuerySchema,
  updatePipelineSchema,
  updateLeadSchema,
} from "./crm.controller.schemas.js";

export function cleanListLeadsInput(
  input: z.infer<typeof listLeadsQuerySchema>,
): ListCrmLeadsInput {
  return {
    ...(input.listingId ? { listingId: input.listingId } : {}),
    limit: input.limit,
    offset: input.offset,
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

export function cleanCreatePipelineInput(
  input: z.infer<typeof createPipelineSchema>,
): CreateCrmPipelineInput {
  return {
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    name: input.name,
    ...(input.rotationActive !== undefined
      ? { rotationActive: input.rotationActive }
      : {}),
    ...(input.stages ? { stages: cleanPipelineStages(input.stages) } : {}),
  };
}

export function cleanUpdatePipelineInput(
  pipelineId: string,
  input: z.infer<typeof updatePipelineSchema>,
): UpdateCrmPipelineInput {
  return {
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    pipelineId,
    ...(input.rotationActive !== undefined
      ? { rotationActive: input.rotationActive }
      : {}),
    ...(input.stages ? { stages: cleanPipelineStages(input.stages) } : {}),
  };
}

function cleanPipelineStages(
  stages: z.infer<typeof createPipelineSchema>["stages"],
): NonNullable<CreateCrmPipelineInput["stages"]> {
  return (stages ?? []).map((stage, index) => ({
    color: stage.color,
    ...(stage.id !== undefined ? { id: stage.id } : {}),
    ...(stage.isSystem !== undefined ? { isSystem: stage.isSystem } : {}),
    ...(stage.leadStatus !== undefined ? { leadStatus: stage.leadStatus } : {}),
    name: stage.name,
    ...(stage.slaDays !== undefined ? { slaDays: stage.slaDays } : {}),
    sortOrder: stage.sortOrder ?? index,
    status: stage.status,
  }));
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

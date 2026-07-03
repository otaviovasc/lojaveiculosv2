import type { UpdateCrmWhatsappSessionInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";

export function cleanSessionUpdate(input: UpdateCrmWhatsappSessionInput) {
  return {
    ...(input.assignedUserId !== undefined
      ? { assignedUserId: input.assignedUserId }
      : {}),
    ...(input.firstHandledAt !== undefined
      ? { firstHandledAt: input.firstHandledAt }
      : {}),
    ...(input.freshLeadAt !== undefined
      ? { freshLeadAt: input.freshLeadAt }
      : {}),
    ...(input.humanTakeoverAt !== undefined
      ? { humanTakeoverAt: input.humanTakeoverAt }
      : {}),
    ...(input.lastAssignedAt !== undefined
      ? { lastAssignedAt: input.lastAssignedAt }
      : {}),
    ...(input.lastCustomerReadAt !== undefined
      ? { lastCustomerReadAt: input.lastCustomerReadAt }
      : {}),
    ...(input.lastReadAt !== undefined ? { lastReadAt: input.lastReadAt } : {}),
    ...(input.leadId !== undefined ? { leadId: input.leadId } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.status ? { status: input.status } : {}),
    updatedAt: new Date(),
  };
}

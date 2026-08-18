import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmLead } from "../ports/crmRepository.js";
import {
  CrmLeadNotFoundError,
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { StartConversationInput } from "../services/CrmMessagingService/startConversation.js";
import { normalizeWhatsappPhone } from "./startConversationSupport.js";
import { CrmMessageActionError } from "./crmMessagingErrors.js";

export type StartConversationTarget = {
  customerDisplayName?: string;
  lead?: CrmLead;
  phone: string;
};

export async function resolveStartConversationTarget(
  context: ServiceContext,
  input: StartConversationInput,
  ports: CrmServicePorts,
): Promise<StartConversationTarget> {
  const scope = requireCrmScope(context);
  if (!input.leadId) {
    if (!input.phone) {
      throw new CrmMessageActionError(
        "WhatsApp phone is required when no lead is selected.",
        400,
      );
    }
    return {
      ...(input.customerDisplayName
        ? { customerDisplayName: input.customerDisplayName }
        : {}),
      phone: normalizeWhatsappPhone(input.phone),
    };
  }

  const lead = await getCrmRepository(ports).findLeadById({
    leadId: input.leadId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!lead) throw new CrmLeadNotFoundError(input.leadId);
  const phone = input.phone ?? lead.buyerPhone;
  if (!phone) {
    throw new CrmMessageActionError(
      "Selected lead must have a WhatsApp phone before starting a conversation.",
      400,
    );
  }
  const customerDisplayName =
    input.customerDisplayName ?? lead.buyerName ?? undefined;
  return {
    ...(customerDisplayName ? { customerDisplayName } : {}),
    lead,
    phone: normalizeWhatsappPhone(phone),
  };
}

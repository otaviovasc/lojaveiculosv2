import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmLead } from "../ports/crmRepository.js";
import {
  CrmLeadNotFoundError,
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { StartWhatsappConversationInput } from "../services/CrmWhatsapp/startWhatsappConversation.js";
import { normalizeWhatsappPhone } from "./startWhatsappConversationSupport.js";
import { WhatsappMessageActionError } from "./whatsappSendErrors.js";

export type StartConversationTarget = {
  buyerName?: string;
  lead?: CrmLead;
  phone: string;
};

export async function resolveStartConversationTarget(
  context: ServiceContext,
  input: StartWhatsappConversationInput,
  ports: CrmServicePorts,
): Promise<StartConversationTarget> {
  const scope = requireCrmScope(context);
  if (!input.leadId) {
    if (!input.phone) {
      throw new WhatsappMessageActionError(
        "WhatsApp phone is required when no lead is selected.",
        400,
      );
    }
    return {
      ...(input.buyerName ? { buyerName: input.buyerName } : {}),
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
    throw new WhatsappMessageActionError(
      "Selected lead must have a WhatsApp phone before starting a conversation.",
      400,
    );
  }
  const buyerName = input.buyerName ?? lead.buyerName ?? undefined;
  return {
    ...(buyerName ? { buyerName } : {}),
    lead,
    phone: normalizeWhatsappPhone(phone),
  };
}

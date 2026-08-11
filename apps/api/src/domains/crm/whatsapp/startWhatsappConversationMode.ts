import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type { CrmWhatsappSendTemplateInput } from "../ports/crmWhatsappGateway.js";
import type { CrmWhatsappMessageType } from "../ports/crmWhatsappRepository.js";
import { WhatsappMessageActionError } from "./whatsappSendErrors.js";

type ConversationStartModeInput = {
  template?: Omit<CrmWhatsappSendTemplateInput, "phone">;
  text?: string;
};

export function assertConversationStartMode(
  provider: CrmConnectionProvider,
  input: ConversationStartModeInput,
) {
  if (provider === "zapi" && input.text && !input.template) return;
  if (provider === "composio_whatsapp" && input.template) return;
  if (provider === "composio_instagram") {
    throw new WhatsappMessageActionError(
      "Instagram conversations must be initiated by the customer.",
      409,
    );
  }
  if (provider === "olx_chat") {
    throw new WhatsappMessageActionError(
      "OLX Chat conversations must be initiated by the buyer.",
      409,
    );
  }
  throw new WhatsappMessageActionError(
    provider === "composio_whatsapp"
      ? "Official WhatsApp conversation starts require an approved template."
      : "Z-API conversation starts require a text message.",
    409,
  );
}

export function conversationContent(input: ConversationStartModeInput) {
  return input.template
    ? `[template:${input.template.name}]`
    : (input.text ?? "");
}

export function conversationMessageType(
  input: ConversationStartModeInput,
): CrmWhatsappMessageType {
  return input.template ? "TEMPLATE" : "TEXT";
}

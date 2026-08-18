import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type { CrmWhatsappSendTemplateInput } from "../ports/crmMessagingGateway.js";
import type { CrmMessageType } from "../ports/crmConversationRepository.js";
import { CrmMessageActionError } from "./crmMessagingErrors.js";

type ConversationStartModeInput = {
  template?: Omit<CrmWhatsappSendTemplateInput, "phone">;
  text?: string;
};

export function assertConversationStartMode(
  connection: {
    channel: "instagram" | "olx_chat" | "whatsapp";
    provider: CrmConnectionProvider;
  },
  input: ConversationStartModeInput,
) {
  const { channel, provider } = connection;
  if (provider === "zapi" && input.text && !input.template) return;
  if (provider === "meta_cloud" && channel === "whatsapp" && input.template)
    return;
  if (channel === "instagram") {
    throw new CrmMessageActionError(
      "Instagram conversations must be initiated by the customer.",
      409,
    );
  }
  if (channel === "olx_chat") {
    throw new CrmMessageActionError(
      "OLX Chat conversations must be initiated by the buyer.",
      409,
    );
  }
  throw new CrmMessageActionError(
    provider === "meta_cloud"
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
): CrmMessageType {
  return input.template ? "TEMPLATE" : "TEXT";
}

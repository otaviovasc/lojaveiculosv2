import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type { CrmMessagingChannel } from "../ports/crmConversationRepositoryTypes.js";
import type { CrmConversationCycle } from "../ports/crmConversationRepositoryModels.js";

export function channelForCrmProvider(
  channel: "instagram" | "olx_chat" | "whatsapp",
): CrmMessagingChannel {
  if (channel === "olx_chat") return "OLX_CHAT";
  return channel === "instagram" ? "INSTAGRAM" : "WHATSAPP";
}

export function supportsStartingTextConversation(
  provider: CrmConnectionProvider,
) {
  return provider === "zapi";
}

export function providerAddressForSession(
  conversationCycle: CrmConversationCycle,
) {
  const address =
    conversationCycle.channel === "INSTAGRAM" ||
    conversationCycle.channel === "OLX_CHAT"
      ? conversationCycle.externalThreadId
      : conversationCycle.customerPhone;
  if (!address) {
    throw new Error(
      "CRM messaging conversationCycle is missing its provider address.",
    );
  }
  return address;
}

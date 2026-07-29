import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type { CrmWhatsappChannel } from "../ports/crmWhatsappRepositoryTypes.js";

export function channelForCrmProvider(
  provider: CrmConnectionProvider,
): CrmWhatsappChannel {
  return provider === "composio_instagram" ? "INSTAGRAM" : "WHATSAPP";
}

export function supportsStartingTextConversation(
  provider: CrmConnectionProvider,
) {
  return provider === "zapi";
}

import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type { CrmWhatsappChannel } from "../ports/crmWhatsappRepositoryTypes.js";
import type { CrmWhatsappSession } from "../ports/crmWhatsappRepositoryModels.js";

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

export function providerAddressForSession(session: CrmWhatsappSession) {
  const address =
    session.channel === "INSTAGRAM"
      ? session.channelExternalId
      : session.buyerPhone;
  if (!address) {
    throw new Error("CRM messaging session is missing its provider address.");
  }
  return address;
}

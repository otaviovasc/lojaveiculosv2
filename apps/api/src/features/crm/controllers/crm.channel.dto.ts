import type { CrmChannel } from "@lojaveiculosv2/shared";
import type { CrmMessagingChannel } from "../../../domains/crm/ports/crmConversationRepositoryTypes.js";

export function toCrmChannelDto(channel: CrmMessagingChannel): CrmChannel {
  switch (channel) {
    case "WHATSAPP":
      return "whatsapp";
    case "INSTAGRAM":
      return "instagram";
    case "OLX_CHAT":
      return "olx_chat";
  }
}

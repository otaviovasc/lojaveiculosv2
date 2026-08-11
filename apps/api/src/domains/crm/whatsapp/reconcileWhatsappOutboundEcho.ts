import type {
  CrmWhatsappMessage,
  IngestCrmWhatsappMessageInput,
} from "../ports/crmWhatsappRepository.js";

const correlatedOrigins = new Set(["bot_api", "human_crm"]);

export function reconciledOutboundEchoSender(
  existing: Pick<
    CrmWhatsappMessage,
    "direction" | "senderOrigin" | "senderType"
  >,
  incoming: Pick<
    IngestCrmWhatsappMessageInput,
    "direction" | "senderOrigin" | "senderType"
  >,
) {
  if (
    existing.direction !== "OUTBOUND" ||
    incoming.direction !== "OUTBOUND" ||
    existing.senderOrigin !== "unknown" ||
    !correlatedOrigins.has(incoming.senderOrigin)
  ) {
    return null;
  }
  return {
    senderOrigin: incoming.senderOrigin,
    senderType: incoming.senderType,
  };
}

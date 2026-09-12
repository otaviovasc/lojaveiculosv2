import type {
  CrmMessage,
  IngestCrmMessageInput,
} from "../ports/crmConversationRepository.js";

const correlatedOrigins = new Set(["external_bot", "human_crm"]);

export function reconciledOutboundEchoSender(
  existing: Pick<CrmMessage, "direction" | "senderOrigin" | "senderType">,
  incoming: Pick<
    IngestCrmMessageInput,
    "direction" | "senderOrigin" | "senderType"
  >,
) {
  if (
    existing.direction !== "OUTBOUND" ||
    incoming.direction !== "OUTBOUND" ||
    !["unknown", "human_channel"].includes(existing.senderOrigin) ||
    !correlatedOrigins.has(incoming.senderOrigin)
  ) {
    return null;
  }
  return {
    senderOrigin: incoming.senderOrigin,
    senderType: incoming.senderType,
  };
}

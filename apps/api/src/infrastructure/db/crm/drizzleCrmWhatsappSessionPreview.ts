import { eq, sql } from "drizzle-orm";
import { crmWhatsappSessions } from "@lojaveiculosv2/db";
import type { IngestCrmWhatsappMessageInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type WhatsappSessionRow = typeof crmWhatsappSessions.$inferSelect & {
  created: boolean;
};

export async function updateSessionPreview(
  db: DrizzleCrmClient,
  input: IngestCrmWhatsappMessageInput,
  session: WhatsappSessionRow,
) {
  await db
    .update(crmWhatsappSessions)
    .set({
      ...(input.buyerChatLid ? { buyerChatLid: input.buyerChatLid } : {}),
      ...(input.buyerName ? { buyerName: input.buyerName } : {}),
      ...sessionStatusPreview(input, session),
      ...crmWhatsappNewerMessagePreview(input),
      ...(input.leadId ? { leadId: input.leadId } : {}),
      messageCount: sql`${crmWhatsappSessions.messageCount} + 1`,
    })
    .where(eq(crmWhatsappSessions.id, session.id));
}

function sessionStatusPreview(
  input: IngestCrmWhatsappMessageInput,
  session: WhatsappSessionRow,
) {
  if (input.direction === "OUTBOUND" && input.senderType === "HUMAN") {
    return {
      firstHandledAt: session.firstHandledAt ?? input.providerTimestamp,
      humanTakeoverAt: session.humanTakeoverAt ?? input.providerTimestamp,
      status: "HUMAN_TAKEOVER" as const,
    };
  }
  if (input.direction === "OUTBOUND") {
    return {
      firstHandledAt: session.firstHandledAt ?? input.providerTimestamp,
    };
  }
  const freshLeadAt =
    session.freshLeadAt ?? input.freshLeadAt ?? input.providerTimestamp;
  if (session.status === "HUMAN_TAKEOVER") {
    return { freshLeadAt };
  }
  return {
    freshLeadAt,
    humanTakeoverAt: null,
    status: "ACTIVE" as const,
  };
}

export function crmWhatsappNewerMessagePreview(
  input: IngestCrmWhatsappMessageInput,
) {
  const providerTimestamp = input.providerTimestamp.toISOString();
  const providerTimestampSql = sql`${providerTimestamp}::timestamptz`;
  const isNewerPreview = sql`${crmWhatsappSessions.lastMessageAt} is null
    or ${providerTimestampSql} > ${crmWhatsappSessions.lastMessageAt}`;
  return {
    lastMessageAt: sql`case
      when ${isNewerPreview} then ${providerTimestampSql}
      else ${crmWhatsappSessions.lastMessageAt}
    end`,
    lastMessageContent: sql`case
      when ${isNewerPreview} then ${input.content}
      else ${crmWhatsappSessions.lastMessageContent}
    end`,
  };
}

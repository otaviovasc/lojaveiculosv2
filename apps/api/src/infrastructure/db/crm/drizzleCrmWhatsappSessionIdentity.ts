import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { crmWhatsappSessions } from "@lojaveiculosv2/db";
import type {
  IngestCrmWhatsappMessageInput,
  UpsertCrmWhatsappSessionContextInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { shouldBackfillWhatsappPhone } from "../../../domains/crm/whatsapp/whatsappContactIdentity.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type WhatsappSessionIdentityInput =
  IngestCrmWhatsappMessageInput | UpsertCrmWhatsappSessionContextInput;

export async function findWhatsappSessionByIdentity(
  db: DrizzleCrmClient,
  input: WhatsappSessionIdentityInput,
) {
  if (input.channelExternalId) {
    const byChannelExternalId = await findScopedSession(
      db,
      input,
      eq(crmWhatsappSessions.channelExternalId, input.channelExternalId),
    );
    if (byChannelExternalId) return byChannelExternalId;
  }
  if (input.buyerPhone) {
    const byPhone = await findScopedSession(
      db,
      input,
      eq(crmWhatsappSessions.buyerPhone, input.buyerPhone),
    );
    if (byPhone) return byPhone;
  }
  if (!input.buyerChatLid) return null;
  return findScopedSession(
    db,
    input,
    eq(crmWhatsappSessions.buyerChatLid, input.buyerChatLid),
  );
}

export async function updateWhatsappSessionIdentity(
  db: DrizzleCrmClient,
  session: typeof crmWhatsappSessions.$inferSelect,
  input: UpsertCrmWhatsappSessionContextInput,
) {
  const matchedByChatLid = Boolean(
    input.buyerChatLid && session.buyerChatLid === input.buyerChatLid,
  );
  const buyerPhone = shouldBackfillWhatsappPhone(
    session.buyerPhone,
    input.buyerPhone,
    matchedByChatLid,
  )
    ? input.buyerPhone
    : session.buyerPhone;
  const buyerChatLid = session.buyerChatLid ?? input.buyerChatLid ?? null;
  const buyerName = session.buyerName ?? input.buyerName ?? null;
  const channelExternalId =
    session.channelExternalId ?? input.channelExternalId ?? null;
  if (
    buyerPhone === session.buyerPhone &&
    buyerChatLid === session.buyerChatLid &&
    buyerName === session.buyerName &&
    channelExternalId === session.channelExternalId
  ) {
    return session;
  }
  const [updated] = await db
    .update(crmWhatsappSessions)
    .set({
      buyerChatLid,
      buyerName,
      buyerPhone,
      channelExternalId,
      revision: sql`${crmWhatsappSessions.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmWhatsappSessions.id, session.id),
        eq(crmWhatsappSessions.storeId, input.storeId),
        eq(crmWhatsappSessions.tenantId, input.tenantId),
      ),
    )
    .returning();
  if (!updated) throw new Error("CRM WhatsApp session context was not found.");
  return updated;
}

async function findScopedSession(
  db: DrizzleCrmClient,
  input: WhatsappSessionIdentityInput,
  identity: SQL,
) {
  const [row] = await db
    .select()
    .from(crmWhatsappSessions)
    .where(
      and(
        eq(crmWhatsappSessions.connectionId, input.connectionId),
        eq(crmWhatsappSessions.storeId, input.storeId),
        eq(crmWhatsappSessions.tenantId, input.tenantId),
        identity,
      ),
    )
    .orderBy(desc(crmWhatsappSessions.updatedAt))
    .limit(1);
  return row;
}

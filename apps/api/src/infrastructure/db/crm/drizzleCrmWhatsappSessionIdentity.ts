import { and, desc, eq, type SQL } from "drizzle-orm";
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
  const exact = await findScopedSession(
    db,
    input,
    eq(crmWhatsappSessions.buyerPhone, input.buyerPhone),
  );
  if (exact || !input.buyerChatLid) return exact;
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
  const [updated] = await db
    .update(crmWhatsappSessions)
    .set({
      ...(shouldBackfillWhatsappPhone(
        session.buyerPhone,
        input.buyerPhone,
        matchedByChatLid,
      )
        ? { buyerPhone: input.buyerPhone }
        : {}),
      buyerChatLid: session.buyerChatLid ?? input.buyerChatLid ?? null,
      buyerName: session.buyerName ?? input.buyerName ?? null,
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

import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { crmWhatsappSessions } from "@lojaveiculosv2/db";
import type {
  IngestCrmWhatsappMessageInput,
  UpsertCrmWhatsappSessionContextInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { shouldBackfillWhatsappPhone } from "../../../domains/crm/whatsapp/whatsappContactIdentity.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toWhatsappSession } from "./drizzleCrmWhatsappMappers.js";
import { countUnreadMessages } from "./drizzleCrmWhatsappQueries.js";

type WhatsappSessionIdentityInput =
  IngestCrmWhatsappMessageInput | UpsertCrmWhatsappSessionContextInput;

export function createSessionIdentityFinder(db: DrizzleCrmClient) {
  return async (input: UpsertCrmWhatsappSessionContextInput) => {
    const row = await findWhatsappSessionByIdentity(db, input);
    return row
      ? toWhatsappSession(row, await countUnreadMessages(db, row))
      : null;
  };
}

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
  const profilePhotoUrl = input.profilePhotoUrl ?? session.profilePhotoUrl;
  const metadata = input.profilePhotoStorageKey
    ? {
        ...readMetadata(session.metadata),
        profilePhoto: { storageKey: input.profilePhotoStorageKey },
      }
    : session.metadata;
  if (
    buyerPhone === session.buyerPhone &&
    buyerChatLid === session.buyerChatLid &&
    buyerName === session.buyerName &&
    channelExternalId === session.channelExternalId &&
    profilePhotoUrl === session.profilePhotoUrl &&
    metadata === session.metadata
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
      profilePhotoUrl,
      metadata,
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

function readMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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

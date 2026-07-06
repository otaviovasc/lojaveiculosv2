import { asc, and, eq } from "drizzle-orm";
import {
  crmTags,
  crmWhatsappSessions,
  crmWhatsappSessionTags,
} from "@lojaveiculosv2/db";
import type { CrmWhatsappSession } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toWhatsappSession } from "./drizzleCrmWhatsappMappers.js";
import { countUnreadMessages } from "./drizzleCrmWhatsappQueries.js";

export async function hydrateWhatsappSession(
  db: DrizzleCrmClient,
  session: CrmWhatsappSession,
) {
  return hydrateSessionTags(session, await listTagsForSession(db, session.id));
}

export async function findHydratedSessionById(
  db: DrizzleCrmClient,
  sessionId: string,
  scope: { storeId: string; tenantId: string },
) {
  const [row] = await db
    .select()
    .from(crmWhatsappSessions)
    .where(
      and(
        eq(crmWhatsappSessions.id, sessionId),
        eq(crmWhatsappSessions.storeId, scope.storeId as never),
        eq(crmWhatsappSessions.tenantId, scope.tenantId as never),
      ),
    )
    .limit(1);
  if (!row) return null;
  return hydrateWhatsappSession(
    db,
    toWhatsappSession(row, await countUnreadMessages(db, row)),
  );
}

export function toCrmWhatsappTag(row: typeof crmTags.$inferSelect) {
  return {
    color: row.color,
    connectionId: row.connectionId,
    emoji: row.emoji,
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  };
}

async function listTagsForSession(db: DrizzleCrmClient, sessionId: string) {
  const rows = await db
    .select({ tag: crmTags })
    .from(crmWhatsappSessionTags)
    .innerJoin(crmTags, eq(crmWhatsappSessionTags.tagId, crmTags.id))
    .where(eq(crmWhatsappSessionTags.sessionId, sessionId))
    .orderBy(asc(crmTags.sortOrder), asc(crmTags.name));
  return rows.map((row) => toCrmWhatsappTag(row.tag));
}

function hydrateSessionTags(
  session: CrmWhatsappSession,
  sessionTags: CrmWhatsappSession["sessionTags"],
) {
  return { ...session, sessionTags };
}

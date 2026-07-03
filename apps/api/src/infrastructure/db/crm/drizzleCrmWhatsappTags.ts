import { and, asc, eq, ilike, isNull, ne } from "drizzle-orm";
import {
  crmTags,
  crmWhatsappSessions,
  crmWhatsappSessionTags,
} from "@lojaveiculosv2/db";
import type {
  CrmWhatsappSession,
  FindOrCreateCrmWhatsappTagInput,
  ListCrmWhatsappTagsInput,
  UpdateCrmWhatsappSessionTagInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toWhatsappSession } from "./drizzleCrmWhatsappMappers.js";
import { countUnreadMessages } from "./drizzleCrmWhatsappQueries.js";

export async function addWhatsappSessionTag(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const tag = await findScopedTagById(db, input);
  if (!tag) return findHydratedSessionById(db, input.sessionId, input);
  if (tag.isColumn) {
    await removeOtherColumnTags(db, input);
  }
  await db
    .insert(crmWhatsappSessionTags)
    .values({
      sessionId: input.sessionId,
      storeId: input.storeId,
      tagId: input.tagId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [crmWhatsappSessionTags.sessionId, crmWhatsappSessionTags.tagId],
    });
  return findHydratedSessionById(db, input.sessionId, input);
}

export async function removeWhatsappSessionTag(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  await db
    .delete(crmWhatsappSessionTags)
    .where(
      and(
        eq(crmWhatsappSessionTags.sessionId, input.sessionId),
        eq(crmWhatsappSessionTags.tagId, input.tagId),
        eq(crmWhatsappSessionTags.storeId, input.storeId),
        eq(crmWhatsappSessionTags.tenantId, input.tenantId),
      ),
    );
  return findHydratedSessionById(db, input.sessionId, input);
}

export async function findOrCreateWhatsappTag(
  db: DrizzleCrmClient,
  input: FindOrCreateCrmWhatsappTagInput,
) {
  const existing = await findTagByName(db, input);
  if (existing) return existing;
  const [inserted] = await db
    .insert(crmTags)
    .values({
      color: input.color ?? "#64748b",
      connectionId: input.connectionId ?? null,
      emoji: input.emoji ?? null,
      isColumn: input.isColumn ?? false,
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [crmTags.storeId, crmTags.connectionId, crmTags.name],
    })
    .returning();
  if (inserted) return toCrmWhatsappTag(inserted);
  const persisted = await findTagByName(db, input);
  if (!persisted) throw new Error("CRM WhatsApp tag was not persisted.");
  return persisted;
}

export async function listWhatsappTags(
  db: DrizzleCrmClient,
  input: ListCrmWhatsappTagsInput,
) {
  const filters = [
    eq(crmTags.storeId, input.storeId as never),
    eq(crmTags.tenantId, input.tenantId as never),
  ];
  if (input.connectionId !== undefined) {
    filters.push(
      input.connectionId
        ? eq(crmTags.connectionId, input.connectionId)
        : isNull(crmTags.connectionId),
    );
  }
  if (input.search) {
    filters.push(ilike(crmTags.name, `%${input.search}%`));
  }
  const rows = await db
    .select()
    .from(crmTags)
    .where(and(...filters))
    .orderBy(asc(crmTags.isColumn), asc(crmTags.sortOrder), asc(crmTags.name))
    .limit(input.limit);
  return rows.map(toCrmWhatsappTag);
}

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

async function listTagsForSession(db: DrizzleCrmClient, sessionId: string) {
  const rows = await db
    .select({ tag: crmTags })
    .from(crmWhatsappSessionTags)
    .innerJoin(crmTags, eq(crmWhatsappSessionTags.tagId, crmTags.id))
    .where(eq(crmWhatsappSessionTags.sessionId, sessionId))
    .orderBy(asc(crmTags.sortOrder), asc(crmTags.name));
  return rows.map((row) => toCrmWhatsappTag(row.tag));
}

async function findTagByName(
  db: DrizzleCrmClient,
  input: {
    connectionId?: string | null;
    name: string;
    storeId: string;
    tenantId: string;
  },
) {
  const connectionId = input.connectionId ?? null;
  const connectionFilter = connectionId
    ? eq(crmTags.connectionId, connectionId)
    : isNull(crmTags.connectionId);
  const [row] = await db
    .select()
    .from(crmTags)
    .where(
      and(
        eq(crmTags.storeId, input.storeId as never),
        eq(crmTags.tenantId, input.tenantId as never),
        connectionFilter,
        eq(crmTags.name, input.name),
      ),
    )
    .limit(1);
  return row ? toCrmWhatsappTag(row) : null;
}

async function findScopedTagById(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const [row] = await db
    .select()
    .from(crmTags)
    .where(
      and(
        eq(crmTags.id, input.tagId),
        eq(crmTags.storeId, input.storeId as never),
        eq(crmTags.tenantId, input.tenantId as never),
      ),
    )
    .limit(1);
  return row ? toCrmWhatsappTag(row) : null;
}

async function removeOtherColumnTags(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const rows = await db
    .select({ sessionTagId: crmWhatsappSessionTags.id })
    .from(crmWhatsappSessionTags)
    .innerJoin(crmTags, eq(crmWhatsappSessionTags.tagId, crmTags.id))
    .where(
      and(
        eq(crmWhatsappSessionTags.sessionId, input.sessionId),
        eq(crmWhatsappSessionTags.storeId, input.storeId),
        eq(crmWhatsappSessionTags.tenantId, input.tenantId),
        eq(crmTags.isColumn, true),
        ne(crmTags.id, input.tagId),
      ),
    );
  for (const row of rows) {
    await db
      .delete(crmWhatsappSessionTags)
      .where(eq(crmWhatsappSessionTags.id, row.sessionTagId));
  }
}

function hydrateSessionTags(
  session: CrmWhatsappSession,
  sessionTags: CrmWhatsappSession["sessionTags"],
) {
  return { ...session, sessionTags };
}

function toCrmWhatsappTag(row: typeof crmTags.$inferSelect) {
  return {
    color: row.color,
    connectionId: row.connectionId,
    emoji: row.emoji,
    id: row.id,
    isColumn: row.isColumn,
    name: row.name,
    sortOrder: row.sortOrder,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  };
}

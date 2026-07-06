import { and, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import {
  crmWhatsappMessages,
  crmWhatsappSessions,
  crmWhatsappSessionTags,
} from "@lojaveiculosv2/db";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  toWhatsappMessage,
  toWhatsappSession,
} from "./drizzleCrmWhatsappMappers.js";
import {
  countUnreadMessages,
  sessionFilters,
} from "./drizzleCrmWhatsappQueries.js";
import {
  findWhatsappMessageByExternalId,
  findWhatsappMessageById,
  updateWhatsappMessage,
} from "./drizzleCrmWhatsappMessages.js";
import {
  createWhatsappQuickMessage,
  deleteWhatsappQuickMessage,
  findWhatsappQuickMessageById,
  listWhatsappQuickMessages,
  updateWhatsappQuickMessage,
} from "./drizzleCrmWhatsappQuickMessages.js";
import {
  createWhatsappScheduledMessage,
  findDueWhatsappScheduledMessageScopes,
  findDueWhatsappScheduledMessages,
  listWhatsappScheduledMessages,
  updateWhatsappScheduledMessage,
} from "./drizzleCrmWhatsappScheduledMessages.js";
import { ingestMessageInDatabase } from "./drizzleCrmWhatsappIngest.js";
import { cleanSessionUpdate } from "./drizzleCrmWhatsappUpdates.js";
import {
  addWhatsappSessionTag,
  createWhatsappTag,
  deleteWhatsappTag,
  findOrCreateWhatsappTag,
  hydrateWhatsappSession,
  listWhatsappTags,
  reorderWhatsappTags,
  removeWhatsappSessionTag,
  updateWhatsappTag,
} from "./drizzleCrmWhatsappTags.js";

export function createDrizzleCrmWhatsappRepository(
  db: DrizzleCrmClient,
  options: { disableTransactions?: boolean } = {},
): CrmWhatsappRepository {
  return {
    async addSessionTag(input) {
      return addWhatsappSessionTag(db, input);
    },
    async findMessageByExternalId(input) {
      return findWhatsappMessageByExternalId(db, input);
    },
    async findMessageById(input) {
      return findWhatsappMessageById(db, input);
    },
    async findOrCreateTag(input) {
      return findOrCreateWhatsappTag(db, input);
    },
    async findDueScheduledMessageScopes(input) {
      return findDueWhatsappScheduledMessageScopes(db, input);
    },
    async createTag(input) {
      return createWhatsappTag(db, input);
    },
    async updateTag(input) {
      return updateWhatsappTag(db, input);
    },
    async deleteTag(input) {
      return deleteWhatsappTag(db, input);
    },
    async reorderTags(input) {
      return reorderWhatsappTags(db, input);
    },
    async listTags(input) {
      return listWhatsappTags(db, input);
    },
    async createQuickMessage(input) {
      return createWhatsappQuickMessage(db, input);
    },
    async countSessions(input) {
      const tagSessionIds = await findSessionIdsByTags(db, input);
      if (tagSessionIds && tagSessionIds.length === 0) return 0;
      const filters = sessionFilters(input);
      if (tagSessionIds) {
        filters.push(inArray(crmWhatsappSessions.id, tagSessionIds));
      }
      if (input.unreadOnly) filters.push(crmWhatsappUnreadSessionPredicate());
      const [row] = await db
        .select({ sessionCount: count() })
        .from(crmWhatsappSessions)
        .where(and(...filters));
      return Number(row?.sessionCount ?? 0);
    },
    async findQuickMessageById(input) {
      return findWhatsappQuickMessageById(db, input);
    },
    async ingestMessage(input) {
      const execute = (client: DrizzleCrmClient) =>
        ingestMessageInDatabase(client, input);
      if (options.disableTransactions) return execute(db);
      return db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
    },
    async listMessages(input) {
      const rows = await db
        .select()
        .from(crmWhatsappMessages)
        .where(
          and(
            eq(crmWhatsappMessages.storeId, input.storeId),
            eq(crmWhatsappMessages.tenantId, input.tenantId),
            eq(crmWhatsappMessages.sessionId, input.sessionId),
          ),
        )
        .orderBy(
          desc(crmWhatsappMessages.providerTimestamp),
          desc(crmWhatsappMessages.createdAt),
        )
        .offset(input.offset)
        .limit(input.limit);

      return rows.map(toWhatsappMessage);
    },
    async listQuickMessages(input) {
      return listWhatsappQuickMessages(db, input);
    },
    async listSessions(input) {
      const tagSessionIds = await findSessionIdsByTags(db, input);
      if (tagSessionIds && tagSessionIds.length === 0) return [];
      const filters = sessionFilters(input);
      if (tagSessionIds) {
        filters.push(inArray(crmWhatsappSessions.id, tagSessionIds));
      }
      if (input.unreadOnly) filters.push(crmWhatsappUnreadSessionPredicate());
      const rows = await db
        .select()
        .from(crmWhatsappSessions)
        .where(and(...filters))
        .orderBy(desc(crmWhatsappSessions.lastMessageAt))
        .offset(input.offset)
        .limit(input.limit);

      const sessions = await Promise.all(
        rows.map(async (row) =>
          hydrateWhatsappSession(
            db,
            toWhatsappSession(row, await countUnreadMessages(db, row)),
          ),
        ),
      );
      return sessions;
    },
    async createScheduledMessage(input) {
      return createWhatsappScheduledMessage(db, input);
    },
    async findDueScheduledMessages(input) {
      return findDueWhatsappScheduledMessages(db, input);
    },
    async listScheduledMessages(input) {
      return listWhatsappScheduledMessages(db, input);
    },
    async updateScheduledMessage(input) {
      return updateWhatsappScheduledMessage(db, input);
    },
    async deleteQuickMessage(input) {
      return deleteWhatsappQuickMessage(db, input);
    },
    async updateSession(input) {
      const [row] = await db
        .update(crmWhatsappSessions)
        .set(cleanSessionUpdate(input))
        .where(
          and(
            eq(crmWhatsappSessions.id, input.sessionId),
            eq(crmWhatsappSessions.storeId, input.storeId),
            eq(crmWhatsappSessions.tenantId, input.tenantId),
          ),
        )
        .returning();
      if (!row) return null;
      return hydrateWhatsappSession(
        db,
        toWhatsappSession(row, await countUnreadMessages(db, row)),
      );
    },
    async updateMessage(input) {
      return updateWhatsappMessage(db, input);
    },
    async updateQuickMessage(input) {
      return updateWhatsappQuickMessage(db, input);
    },
    async removeSessionTag(input) {
      return removeWhatsappSessionTag(db, input);
    },
  };
}

async function findSessionIdsByTags(
  db: DrizzleCrmClient,
  input: Parameters<CrmWhatsappRepository["countSessions"]>[0],
) {
  if (!input.tagIds?.length) return null;
  const rows = await db
    .select({ sessionId: crmWhatsappSessionTags.sessionId })
    .from(crmWhatsappSessionTags)
    .where(
      and(
        eq(crmWhatsappSessionTags.storeId, input.storeId),
        eq(crmWhatsappSessionTags.tenantId, input.tenantId),
        inArray(crmWhatsappSessionTags.tagId, input.tagIds),
      ),
    );
  return Array.from(new Set(rows.map((row) => row.sessionId)));
}

export function crmWhatsappUnreadSessionPredicate(): SQL {
  return sql`exists (
    select 1
    from ${crmWhatsappMessages}
    where ${crmWhatsappMessages.sessionId} = ${crmWhatsappSessions.id}
      and ${crmWhatsappMessages.direction} = 'INBOUND'
      and ${crmWhatsappMessages.createdAt} > coalesce(
        ${crmWhatsappSessions.lastReadAt},
        timestamp with time zone '1970-01-01 00:00:00+00'
      )
  )`;
}

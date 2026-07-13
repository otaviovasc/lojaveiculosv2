import { and, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import {
  crmWhatsappMessages,
  crmWhatsappSessions,
  crmWhatsappSessionTags,
} from "@lojaveiculosv2/db";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toWhatsappSession } from "./drizzleCrmWhatsappMappers.js";
import {
  countUnreadMessages,
  sessionFilters,
} from "./drizzleCrmWhatsappQueries.js";
import {
  findWhatsappMessageByExternalId,
  findWhatsappMessageById,
  listWhatsappMessages,
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
import {
  createWhatsappCampaign,
  findWhatsappCampaignById,
  incrementWhatsappCampaignCounts,
  listWhatsappCampaigns,
  updateWhatsappCampaign,
} from "./drizzleCrmWhatsappCampaigns.js";
import {
  createWhatsappCampaignRecipient,
  listWhatsappCampaignRecipients,
  updateWhatsappCampaignRecipient,
} from "./drizzleCrmWhatsappCampaignRecipients.js";
import {
  ingestMessageWithTransaction,
  upsertSessionContextWithTransaction,
} from "./drizzleCrmWhatsappIngest.js";
import { updateWhatsappSession } from "./drizzleCrmWhatsappUpdates.js";
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
    async createCampaign(input) {
      return createWhatsappCampaign(db, input);
    },
    async createCampaignRecipient(input) {
      return createWhatsappCampaignRecipient(db, input);
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
    async findCampaignById(input) {
      return findWhatsappCampaignById(db, input);
    },
    ingestMessage: (input) =>
      ingestMessageWithTransaction(db, input, !!options.disableTransactions),
    incrementCampaignCounts: (input) =>
      incrementWhatsappCampaignCounts(db, input),
    async listMessages(input) {
      return listWhatsappMessages(db, input);
    },
    async listCampaigns(input) {
      return listWhatsappCampaigns(db, input);
    },
    async listCampaignRecipients(input) {
      return listWhatsappCampaignRecipients(db, input);
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
    updateSession: (input) => updateWhatsappSession(db, input),
    upsertSessionContext: (input) =>
      upsertSessionContextWithTransaction(
        db,
        input,
        !!options.disableTransactions,
      ),
    async updateMessage(input) {
      return updateWhatsappMessage(db, input);
    },
    async updateQuickMessage(input) {
      return updateWhatsappQuickMessage(db, input);
    },
    async updateCampaign(input) {
      return updateWhatsappCampaign(db, input);
    },
    async updateCampaignRecipient(input) {
      return updateWhatsappCampaignRecipient(db, input);
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

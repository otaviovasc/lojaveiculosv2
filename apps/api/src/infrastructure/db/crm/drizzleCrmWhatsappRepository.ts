import { and, desc, eq, inArray } from "drizzle-orm";
import {
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toWhatsappSession } from "./drizzleCrmWhatsappMappers.js";
import {
  countSessionsByAssignee as countWhatsappSessionsByAssignee,
  countCanonicalSessions,
  countUnreadMessages,
  canonicalSessionSelection,
  crmWhatsappUnreadSessionPredicate,
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
import { updateWhatsappSessionWithTransaction } from "./drizzleCrmWhatsappUpdates.js";
import { transitionWhatsappAttendanceWithTransaction } from "./drizzleCrmWhatsappAttendance.js";
import {
  createWhatsappTag,
  deleteWhatsappTag,
  findOrCreateWhatsappTag,
  hydrateWhatsappSession,
  listWhatsappTags,
  reorderWhatsappTags,
  updateWhatsappTag,
} from "./drizzleCrmWhatsappTags.js";
import {
  findSessionIdsByTags,
  mutateWhatsappSessionTagWithTransaction,
} from "./drizzleCrmWhatsappSessionTags.js";
import { createSessionIdentityFinder } from "./drizzleCrmWhatsappSessionIdentity.js";

export function createDrizzleCrmWhatsappRepository(
  db: DrizzleCrmClient,
  options: { disableTransactions?: boolean } = {},
): CrmWhatsappRepository {
  return {
    addSessionTag: (input) =>
      mutateWhatsappSessionTagWithTransaction(
        db,
        input,
        "add",
        !!options.disableTransactions,
      ),
    async findMessageByExternalId(input) {
      return findWhatsappMessageByExternalId(db, input);
    },
    async findMessageById(input) {
      return findWhatsappMessageById(db, input);
    },
    findSessionByIdentity: createSessionIdentityFinder(db),
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
      return countCanonicalSessions(db, input, tagSessionIds);
    },
    async countSessionsByAssignee(input) {
      const tagSessionIds = await findSessionIdsByTags(db, input);
      if (tagSessionIds && tagSessionIds.length === 0) return [];
      const filters = sessionFilters({ ...input, filter: "all" });
      if (tagSessionIds)
        filters.push(inArray(conversationThreads.id, tagSessionIds));
      if (input.unreadOnly) filters.push(crmWhatsappUnreadSessionPredicate());
      return countWhatsappSessionsByAssignee(db, filters);
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
        filters.push(inArray(conversationThreads.id, tagSessionIds));
      }
      if (input.unreadOnly) filters.push(crmWhatsappUnreadSessionPredicate());
      const rows = await db
        .select(canonicalSessionSelection())
        .from(conversationCycles)
        .innerJoin(
          conversationThreads,
          eq(conversationCycles.threadId, conversationThreads.id),
        )
        .innerJoin(
          conversationAttendances,
          eq(conversationAttendances.cycleId, conversationCycles.id),
        )
        .where(and(...filters))
        .orderBy(desc(conversationCycles.lastMessageAt))
        .offset(input.offset)
        .limit(input.limit);
      return Promise.all(
        rows.map(async (row) =>
          hydrateWhatsappSession(
            db,
            toWhatsappSession(row, await countUnreadMessages(db, row)),
          ),
        ),
      );
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
    updateSession: (input) =>
      updateWhatsappSessionWithTransaction(
        db,
        input,
        !!options.disableTransactions,
      ),
    transitionAttendance: (input) =>
      transitionWhatsappAttendanceWithTransaction(
        db,
        input,
        !!options.disableTransactions,
      ),
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
    removeSessionTag: (input) =>
      mutateWhatsappSessionTagWithTransaction(
        db,
        input,
        "remove",
        !!options.disableTransactions,
      ),
  };
}

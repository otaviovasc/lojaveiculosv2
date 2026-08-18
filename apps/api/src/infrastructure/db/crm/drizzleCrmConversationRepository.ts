import { and, desc, eq, inArray } from "drizzle-orm";
import {
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import type { CrmConversationRepository } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toConversationCycle } from "./drizzleCrmConversationMappers.js";
import {
  countConversationCyclesByAssignee as countConversationCyclesByAssignee,
  countCanonicalConversationCycles,
  countUnreadMessages,
  canonicalConversationCycleSelection,
  crmUnreadConversationCyclePredicate,
  conversationCycleFilters,
} from "./drizzleCrmConversationQueries.js";
import {
  findCrmMessageDtoByExternalId,
  findCrmMessageDtoById,
  listMessages,
  updateCrmMessage,
} from "./drizzleCrmMessages.js";
import {
  createCrmQuickMessage,
  deleteCrmQuickMessage,
  findCrmQuickMessageById,
  listCrmQuickMessages,
  updateCrmQuickMessage,
} from "./drizzleCrmQuickMessages.js";
import {
  createCrmScheduledMessage,
  findDueCrmScheduledMessageScopes,
  findDueCrmScheduledMessages,
  listCrmScheduledMessages,
  updateCrmScheduledMessage,
} from "./drizzleCrmScheduledMessages.js";
import {
  createCrmCampaign,
  findCrmCampaignById,
  incrementCrmCampaignCounts,
  listCrmCampaigns,
  updateCrmCampaign,
} from "./drizzleCrmCampaigns.js";
import {
  createCrmCampaignRecipient,
  listCrmCampaignRecipients,
  updateCrmCampaignRecipient,
} from "./drizzleCrmCampaignRecipients.js";
import {
  ingestMessageWithTransaction,
  upsertConversationCycleContextWithTransaction,
} from "./drizzleCrmConversationIngest.js";
import { updateConversationCycleWithTransaction } from "./drizzleCrmConversationUpdates.js";
import { transitionWhatsappAttendanceWithTransaction } from "./drizzleCrmAttendance.js";
import {
  createWhatsappTag,
  deleteWhatsappTag,
  findOrCreateWhatsappTag,
  hydrateConversationCycle,
  listCrmTags,
  reorderWhatsappTags,
  updateWhatsappTag,
} from "./drizzleCrmTags.js";
import {
  findSessionIdsByTags,
  mutateConversationCycleTagWithTransaction,
} from "./drizzleCrmConversationCycleTags.js";
import { createSessionIdentityFinder } from "./drizzleCrmConversationCycleIdentity.js";

export function createDrizzleCrmConversationRepository(
  db: DrizzleCrmClient,
  options: { disableTransactions?: boolean } = {},
): CrmConversationRepository {
  return {
    addConversationCycleTag: (input) =>
      mutateConversationCycleTagWithTransaction(
        db,
        input,
        "add",
        !!options.disableTransactions,
      ),
    async findMessageByExternalId(input) {
      return findCrmMessageDtoByExternalId(db, input);
    },
    async findMessageById(input) {
      return findCrmMessageDtoById(db, input);
    },
    findConversationCycleByIdentity: createSessionIdentityFinder(db),
    async findOrCreateTag(input) {
      return findOrCreateWhatsappTag(db, input);
    },
    async findDueScheduledMessageScopes(input) {
      return findDueCrmScheduledMessageScopes(db, input);
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
      return listCrmTags(db, input);
    },
    async createQuickMessage(input) {
      return createCrmQuickMessage(db, input);
    },
    async createCampaign(input) {
      return createCrmCampaign(db, input);
    },
    async createCampaignRecipient(input) {
      return createCrmCampaignRecipient(db, input);
    },
    async countConversationCycles(input) {
      const tagSessionIds = await findSessionIdsByTags(db, input);
      if (tagSessionIds && tagSessionIds.length === 0) return 0;
      return countCanonicalConversationCycles(db, input, tagSessionIds);
    },
    async countConversationCyclesByAssignee(input) {
      const tagSessionIds = await findSessionIdsByTags(db, input);
      if (tagSessionIds && tagSessionIds.length === 0) return [];
      const filters = conversationCycleFilters({ ...input, filter: "all" });
      if (tagSessionIds)
        filters.push(inArray(conversationThreads.id, tagSessionIds));
      if (input.unreadOnly) filters.push(crmUnreadConversationCyclePredicate());
      return countConversationCyclesByAssignee(db, filters);
    },
    async findQuickMessageById(input) {
      return findCrmQuickMessageById(db, input);
    },
    async findCampaignById(input) {
      return findCrmCampaignById(db, input);
    },
    ingestMessage: (input) =>
      ingestMessageWithTransaction(db, input, !!options.disableTransactions),
    incrementCampaignCounts: (input) => incrementCrmCampaignCounts(db, input),
    async listMessages(input) {
      return listMessages(db, input);
    },
    async listCampaigns(input) {
      return listCrmCampaigns(db, input);
    },
    async listCampaignRecipients(input) {
      return listCrmCampaignRecipients(db, input);
    },
    async listQuickMessages(input) {
      return listCrmQuickMessages(db, input);
    },
    async listConversationCycles(input) {
      const tagSessionIds = await findSessionIdsByTags(db, input);
      if (tagSessionIds && tagSessionIds.length === 0) return [];
      const filters = conversationCycleFilters(input);
      if (tagSessionIds) {
        filters.push(inArray(conversationThreads.id, tagSessionIds));
      }
      if (input.unreadOnly) filters.push(crmUnreadConversationCyclePredicate());
      const rows = await db
        .select(canonicalConversationCycleSelection())
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
          hydrateConversationCycle(
            db,
            toConversationCycle(row, await countUnreadMessages(db, row)),
          ),
        ),
      );
    },
    async createScheduledMessage(input) {
      return createCrmScheduledMessage(db, input);
    },
    async findDueScheduledMessages(input) {
      return findDueCrmScheduledMessages(db, input);
    },
    async listScheduledMessages(input) {
      return listCrmScheduledMessages(db, input);
    },
    async updateScheduledMessage(input) {
      return updateCrmScheduledMessage(db, input);
    },
    async deleteQuickMessage(input) {
      return deleteCrmQuickMessage(db, input);
    },
    updateConversationCycle: (input) =>
      updateConversationCycleWithTransaction(
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
    upsertConversationCycleContext: (input) =>
      upsertConversationCycleContextWithTransaction(
        db,
        input,
        !!options.disableTransactions,
      ),
    async updateMessage(input) {
      return updateCrmMessage(db, input);
    },
    async updateQuickMessage(input) {
      return updateCrmQuickMessage(db, input);
    },
    async updateCampaign(input) {
      return updateCrmCampaign(db, input);
    },
    async updateCampaignRecipient(input) {
      return updateCrmCampaignRecipient(db, input);
    },
    removeConversationCycleTag: (input) =>
      mutateConversationCycleTagWithTransaction(
        db,
        input,
        "remove",
        !!options.disableTransactions,
      ),
  };
}

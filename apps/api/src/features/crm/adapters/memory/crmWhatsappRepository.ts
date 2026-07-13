import type {
  CrmWhatsappMessage,
  CrmWhatsappCampaign,
  CrmWhatsappCampaignRecipient,
  CrmWhatsappQuickMessage,
  CrmWhatsappRepository,
  CrmWhatsappScheduledMessage,
  CrmWhatsappSession,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import {
  compareMessagesNewestFirst,
  withUnreadCount,
} from "./crmWhatsappMemoryQueries.js";
import {
  countMemorySessions,
  listMemorySessions,
} from "./crmWhatsappMemorySessionViews.js";
import {
  findMemoryWhatsappMessageByExternalId,
  findMemoryWhatsappMessageById,
  updateMemoryWhatsappMessage,
  updateMemoryWhatsappSession,
} from "./crmWhatsappMemoryMutations.js";
import {
  ingestMemoryWhatsappMessage,
  upsertMemorySessionContext,
} from "./crmWhatsappMemoryIngest.js";
import {
  createMemoryQuickMessage,
  deleteMemoryQuickMessage,
  findMemoryQuickMessageById,
  listMemoryQuickMessages,
  updateMemoryQuickMessage,
} from "./crmWhatsappMemoryQuickMessages.js";
import {
  createMemoryScheduledMessage,
  findDueMemoryScheduledMessageScopes,
  findDueMemoryScheduledMessages,
  listMemoryScheduledMessages,
  updateMemoryScheduledMessage,
} from "./crmWhatsappMemoryScheduledMessages.js";
import {
  createMemoryCampaign,
  findMemoryCampaign,
  incrementMemoryCampaignCounts,
  listMemoryCampaigns,
  updateMemoryCampaign,
} from "./crmWhatsappMemoryCampaigns.js";
import {
  createMemoryCampaignRecipient,
  listMemoryCampaignRecipients,
  updateMemoryCampaignRecipient,
} from "./crmWhatsappMemoryCampaignRecipients.js";
import {
  addMemorySessionTag,
  createMemoryTag,
  deleteMemoryTag,
  findOrCreateMemoryTag,
  hydrateSessionTags,
  listMemoryTags,
  reorderMemoryTags,
  removeMemorySessionTag,
  requireHydratedSession,
  updateMemoryTag,
  type MemoryWhatsappTagState,
} from "./crmWhatsappMemoryTags.js";

export function createMemoryCrmWhatsappRepository(
  initialSessions: readonly CrmWhatsappSession[] = [],
  initialMessages: readonly CrmWhatsappMessage[] = [],
  initialQuickMessages: readonly CrmWhatsappQuickMessage[] = [],
): CrmWhatsappRepository {
  const sessions = [...initialSessions];
  const messages = [...initialMessages];
  const campaigns: CrmWhatsappCampaign[] = [];
  const campaignRecipients: CrmWhatsappCampaignRecipient[] = [];
  const quickMessages = [...initialQuickMessages];
  const scheduledMessages: CrmWhatsappScheduledMessage[] = [];
  const tagState: MemoryWhatsappTagState = { sessionTags: [], tags: [] };

  return {
    async addSessionTag(input) {
      return addMemorySessionTag(tagState, sessions, messages, input);
    },
    async findMessageByExternalId(input) {
      return findMemoryWhatsappMessageByExternalId(messages, input);
    },
    async findMessageById(input) {
      return findMemoryWhatsappMessageById(messages, input);
    },
    async findOrCreateTag(input) {
      return findOrCreateMemoryTag(tagState, input);
    },
    async findDueScheduledMessageScopes(input) {
      return findDueMemoryScheduledMessageScopes(scheduledMessages, input);
    },
    async createTag(input) {
      return createMemoryTag(tagState, input);
    },
    async updateTag(input) {
      return updateMemoryTag(tagState, input);
    },
    async deleteTag(input) {
      return deleteMemoryTag(tagState, input);
    },
    async reorderTags(input) {
      return reorderMemoryTags(tagState, input);
    },
    async listTags(input) {
      return listMemoryTags(tagState, input);
    },
    async createQuickMessage(input) {
      return createMemoryQuickMessage(quickMessages, input);
    },
    async createCampaign(input) {
      return createMemoryCampaign(campaigns, input);
    },
    async createCampaignRecipient(input) {
      return createMemoryCampaignRecipient(campaignRecipients, input);
    },
    async countSessions(input) {
      return countMemorySessions({
        messages,
        query: input,
        sessions,
        tagState,
      });
    },
    async findQuickMessageById(input) {
      return findMemoryQuickMessageById(quickMessages, input);
    },
    async findCampaignById(input) {
      return findMemoryCampaign(campaigns, input);
    },
    ingestMessage: (input) =>
      ingestMemoryWhatsappMessage({
        message: input,
        messages,
        sessions,
        tagState,
      }),
    incrementCampaignCounts: (input) =>
      Promise.resolve(incrementMemoryCampaignCounts(campaigns, input)),
    async listMessages(input) {
      return messages
        .filter((message) => message.storeId === input.storeId)
        .filter((message) => message.tenantId === input.tenantId)
        .filter((message) => message.sessionId === input.sessionId)
        .sort(compareMessagesNewestFirst)
        .slice(input.offset, input.offset + input.limit);
    },
    async listCampaigns(input) {
      return listMemoryCampaigns(campaigns, input);
    },
    async listCampaignRecipients(input) {
      return listMemoryCampaignRecipients(campaignRecipients, input);
    },
    async listQuickMessages(input) {
      return listMemoryQuickMessages(quickMessages, input);
    },
    async listSessions(input) {
      return listMemorySessions({
        messages,
        query: input,
        sessions,
        tagState,
      });
    },
    async createScheduledMessage(input) {
      return createMemoryScheduledMessage(scheduledMessages, input);
    },
    async findDueScheduledMessages(input) {
      return findDueMemoryScheduledMessages(scheduledMessages, input);
    },
    async listScheduledMessages(input) {
      return listMemoryScheduledMessages(scheduledMessages, input);
    },
    async updateScheduledMessage(input) {
      return updateMemoryScheduledMessage(scheduledMessages, input);
    },
    async deleteQuickMessage(input) {
      return deleteMemoryQuickMessage(quickMessages, input);
    },
    async updateSession(input) {
      return hydrateSessionTags(
        updateMemoryWhatsappSession(sessions, messages, input),
        tagState,
      );
    },
    async upsertSessionContext(input) {
      return requireHydratedSession(
        withUnreadCount(upsertMemorySessionContext(sessions, input), messages),
        tagState,
      );
    },
    async updateQuickMessage(input) {
      return updateMemoryQuickMessage(quickMessages, input);
    },
    async updateCampaign(input) {
      return updateMemoryCampaign(campaigns, input);
    },
    async updateCampaignRecipient(input) {
      return updateMemoryCampaignRecipient(campaignRecipients, input);
    },
    async updateMessage(input) {
      return updateMemoryWhatsappMessage(messages, input);
    },
    async removeSessionTag(input) {
      return removeMemorySessionTag(tagState, sessions, messages, input);
    },
  };
}

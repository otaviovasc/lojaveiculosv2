import type {
  CrmMessage,
  CrmCampaign,
  CrmCampaignRecipient,
  CrmQuickMessage,
  CrmConversationRepository,
  CrmScheduledMessage,
  CrmConversationCycle,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import {
  compareMessagesNewestFirst,
  withUnreadCount,
} from "./crmConversationMemoryQueries.js";
import {
  countMemoryCycles,
  countMemoryCyclesByAssignee,
  listMemoryCycles,
} from "./crmConversationCycleMemoryViews.js";
import {
  findMemoryCrmMessageByExternalId,
  findMemoryCrmMessageById,
  updateMemoryCrmMessage,
  updateMemoryCrmConversationCycle,
} from "./crmConversationMemoryMutations.js";
import {
  findMemoryCycle,
  ingestMemoryCrmMessage,
  upsertMemoryCycleContext,
} from "./crmConversationMemoryIngest.js";
import {
  createMemoryQuickMessage,
  deleteMemoryQuickMessage,
  findMemoryQuickMessageById,
  listMemoryQuickMessages,
  updateMemoryQuickMessage,
} from "./crmQuickMessageMemory.js";
import {
  createMemoryScheduledMessage,
  findDueMemoryScheduledMessageScopes,
  findDueMemoryScheduledMessages,
  listMemoryScheduledMessages,
  updateMemoryScheduledMessage,
} from "./crmScheduledMessageMemory.js";
import {
  createMemoryCampaign,
  findMemoryCampaign,
  incrementMemoryCampaignCounts,
  listMemoryCampaigns,
  updateMemoryCampaign,
} from "./crmCampaignMemory.js";
import {
  createMemoryCampaignRecipient,
  listMemoryCampaignRecipients,
  updateMemoryCampaignRecipient,
} from "./crmCampaignRecipientMemory.js";
import {
  addMemoryCycleTag,
  createMemoryTag,
  deleteMemoryTag,
  findOrCreateMemoryTag,
  hydrateCycleTags,
  listMemoryTags,
  reorderMemoryTags,
  removeMemoryCycleTag,
  requireHydratedCycle,
  updateMemoryTag,
  type MemoryCrmTagState,
} from "./crmTagMemory.js";
import { transitionMemoryWhatsappAttendance } from "./crmConversationMemoryAttendance.js";

export function createMemoryCrmConversationRepository(
  initialCycles: readonly CrmConversationCycle[] = [],
  initialMessages: readonly CrmMessage[] = [],
  initialQuickMessages: readonly CrmQuickMessage[] = [],
): CrmConversationRepository {
  const cycles = [...initialCycles];
  const messages = [...initialMessages];
  const campaigns: CrmCampaign[] = [];
  const campaignRecipients: CrmCampaignRecipient[] = [];
  const quickMessages = [...initialQuickMessages];
  const scheduledMessages: CrmScheduledMessage[] = [];
  const attendanceLedgerFingerprints = new Map<string, string>();
  const tagState: MemoryCrmTagState = { cycleTags: [], tags: [] };

  return {
    async addConversationCycleTag(input) {
      return addMemoryCycleTag(tagState, cycles, messages, input);
    },
    async findMessageByExternalId(input) {
      return findMemoryCrmMessageByExternalId(messages, input);
    },
    async findMessageById(input) {
      return findMemoryCrmMessageById(messages, input);
    },
    async findConversationCycleByIdentity(input) {
      return findMemoryCycle(cycles, input) ?? null;
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
    async countConversationCycles(input) {
      return countMemoryCycles({
        messages,
        query: input,
        cycles,
        tagState,
      });
    },
    async countConversationCyclesByAssignee(input) {
      return countMemoryCyclesByAssignee({
        messages,
        query: input,
        cycles,
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
      ingestMemoryCrmMessage({
        message: input,
        messages,
        cycles,
        tagState,
      }),
    incrementCampaignCounts: (input) =>
      Promise.resolve(incrementMemoryCampaignCounts(campaigns, input)),
    async listMessages(input) {
      return messages
        .filter((message) => message.storeId === input.storeId)
        .filter((message) => message.tenantId === input.tenantId)
        .filter((message) => message.cycleId === input.cycleId)
        .filter(
          (message) =>
            !input.direction || message.direction === input.direction,
        )
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
    async listConversationCycles(input) {
      return listMemoryCycles({
        messages,
        query: input,
        cycles,
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
    async updateConversationCycle(input) {
      return hydrateCycleTags(
        updateMemoryCrmConversationCycle(cycles, messages, input),
        tagState,
      );
    },
    async transitionAttendance(input) {
      return transitionMemoryWhatsappAttendance(
        { attendanceLedgerFingerprints, messages, cycles, tagState },
        input,
      );
    },
    async upsertConversationCycleContext(input) {
      return requireHydratedCycle(
        withUnreadCount(upsertMemoryCycleContext(cycles, input), messages),
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
      return updateMemoryCrmMessage(messages, input);
    },
    async removeConversationCycleTag(input) {
      return removeMemoryCycleTag(tagState, cycles, messages, input);
    },
  };
}

import type {
  CrmWhatsappMessage,
  CrmWhatsappQuickMessage,
  CrmWhatsappRepository,
  CrmWhatsappScheduledMessage,
  CrmWhatsappSession,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import {
  compareMessagesNewestFirst,
  compareSessionsNewestFirst,
  matchesFilter,
  matchesSearch,
  withUnreadCount,
} from "./crmWhatsappMemoryQueries.js";
import {
  findMemoryWhatsappMessageByExternalId,
  findMemoryWhatsappMessageById,
  updateMemoryWhatsappMessage,
  updateMemoryWhatsappSession,
} from "./crmWhatsappMemoryMutations.js";
import {
  createMemoryMessage,
  createMemorySession,
  findMemorySession,
  updateMemorySessionPreview,
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
    async countSessions(input) {
      return sessions
        .filter((session) => session.storeId === input.storeId)
        .filter((session) => session.tenantId === input.tenantId)
        .filter(
          (session) =>
            !input.connectionId || session.connectionId === input.connectionId,
        )
        .filter((session) => !input.leadId || session.leadId === input.leadId)
        .filter((session) => !input.sessionId || session.id === input.sessionId)
        .filter((session) => !input.status || session.status === input.status)
        .filter(
          (session) =>
            !input.tagIds?.length ||
            tagState.sessionTags.some(
              (item) =>
                item.sessionId === session.id &&
                input.tagIds!.includes(item.tagId),
            ),
        )
        .filter((session) => matchesFilter(session, input))
        .filter((session) => matchesSearch(session, input.search))
        .map((session) => withUnreadCount(session, messages))
        .filter((session) => !input.unreadOnly || session.unreadCount > 0)
        .length;
    },
    async findQuickMessageById(input) {
      return findMemoryQuickMessageById(quickMessages, input);
    },
    async ingestMessage(input) {
      const now = new Date();
      let createdSession = false;
      let session = findMemorySession(sessions, input);

      if (!session) {
        createdSession = true;
        session = createMemorySession(input, now);
        sessions.push(session);
      } else if (
        input.direction === "INBOUND" &&
        session.status === "COMPLETED"
      ) {
        session.status = "ACTIVE";
        session.humanTakeoverAt = null;
      }

      const existing = messages.find(
        (message) =>
          message.sessionId === session.id &&
          message.externalId === input.externalId,
      );
      if (existing) {
        return {
          createdMessage: false,
          createdSession,
          message: existing,
          session: requireHydratedSession(
            withUnreadCount(session, messages),
            tagState,
          ),
        };
      }

      const message = createMemoryMessage(input, session.id, now);
      messages.push(message);
      updateMemorySessionPreview(session, input);

      return {
        createdMessage: true,
        createdSession,
        message,
        session: requireHydratedSession(
          withUnreadCount(session, messages),
          tagState,
        ),
      };
    },
    async listMessages(input) {
      return messages
        .filter((message) => message.storeId === input.storeId)
        .filter((message) => message.tenantId === input.tenantId)
        .filter((message) => message.sessionId === input.sessionId)
        .sort(compareMessagesNewestFirst)
        .slice(input.offset, input.offset + input.limit);
    },
    async listQuickMessages(input) {
      return listMemoryQuickMessages(quickMessages, input);
    },
    async listSessions(input) {
      return sessions
        .filter((session) => session.storeId === input.storeId)
        .filter((session) => session.tenantId === input.tenantId)
        .filter(
          (session) =>
            !input.connectionId || session.connectionId === input.connectionId,
        )
        .filter((session) => !input.leadId || session.leadId === input.leadId)
        .filter((session) => !input.sessionId || session.id === input.sessionId)
        .filter((session) => !input.status || session.status === input.status)
        .filter(
          (session) =>
            !input.tagIds?.length ||
            tagState.sessionTags.some(
              (item) =>
                item.sessionId === session.id &&
                input.tagIds!.includes(item.tagId),
            ),
        )
        .filter((session) => matchesFilter(session, input))
        .filter((session) => matchesSearch(session, input.search))
        .map((session) => withUnreadCount(session, messages))
        .map((session) => requireHydratedSession(session, tagState))
        .filter((session) => !input.unreadOnly || session.unreadCount > 0)
        .sort(compareSessionsNewestFirst)
        .slice(input.offset, input.offset + input.limit);
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
    async updateQuickMessage(input) {
      return updateMemoryQuickMessage(quickMessages, input);
    },
    async updateMessage(input) {
      return updateMemoryWhatsappMessage(messages, input);
    },
    async removeSessionTag(input) {
      return removeMemorySessionTag(tagState, sessions, messages, input);
    },
  };
}

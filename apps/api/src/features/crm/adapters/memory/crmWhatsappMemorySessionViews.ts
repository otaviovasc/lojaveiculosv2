import type {
  CountCrmWhatsappSessionsInput,
  CrmWhatsappMessage,
  CrmWhatsappSession,
  ListCrmWhatsappSessionsInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import {
  compareSessionsNewestFirst,
  matchesFilter,
  matchesSearch,
  withUnreadCount,
} from "./crmWhatsappMemoryQueries.js";
import {
  requireHydratedSession,
  type MemoryWhatsappTagState,
} from "./crmWhatsappMemoryTags.js";

export function countMemorySessions(input: {
  messages: readonly CrmWhatsappMessage[];
  query: CountCrmWhatsappSessionsInput;
  sessions: readonly CrmWhatsappSession[];
  tagState: MemoryWhatsappTagState;
}) {
  return filterMemorySessions(input).length;
}

export function countMemorySessionsByAssignee(input: {
  messages: readonly CrmWhatsappMessage[];
  query: CountCrmWhatsappSessionsInput;
  sessions: readonly CrmWhatsappSession[];
  tagState: MemoryWhatsappTagState;
}) {
  const counts = new Map<
    NonNullable<CrmWhatsappSession["assignedUserId"]>,
    number
  >();
  const sessions = filterMemorySessions({
    ...input,
    query: { ...input.query, filter: "all" },
  });
  sessions.forEach((session) => {
    if (!session.assignedUserId) return;
    counts.set(
      session.assignedUserId,
      (counts.get(session.assignedUserId) ?? 0) + 1,
    );
  });
  return Array.from(counts, ([assigneeId, count]) => ({ assigneeId, count }));
}

export function listMemorySessions(input: {
  messages: readonly CrmWhatsappMessage[];
  query: ListCrmWhatsappSessionsInput;
  sessions: readonly CrmWhatsappSession[];
  tagState: MemoryWhatsappTagState;
}) {
  return filterMemorySessions(input)
    .map((session) => requireHydratedSession(session, input.tagState))
    .sort(compareSessionsNewestFirst)
    .slice(input.query.offset, input.query.offset + input.query.limit);
}

function filterMemorySessions(input: {
  messages: readonly CrmWhatsappMessage[];
  query: CountCrmWhatsappSessionsInput;
  sessions: readonly CrmWhatsappSession[];
  tagState: MemoryWhatsappTagState;
}) {
  return input.sessions
    .filter((session) => session.storeId === input.query.storeId)
    .filter((session) => session.tenantId === input.query.tenantId)
    .filter(
      (session) =>
        !input.query.connectionId ||
        session.connectionId === input.query.connectionId,
    )
    .filter(
      (session) => !input.query.leadId || session.leadId === input.query.leadId,
    )
    .filter(
      (session) =>
        !input.query.sessionId || session.id === input.query.sessionId,
    )
    .filter(
      (session) => !input.query.status || session.status === input.query.status,
    )
    .filter((session) => matchesTagFilter(session, input))
    .filter((session) => matchesFilter(session, input.query))
    .filter((session) => matchesSearch(session, input.query.search))
    .map((session) => withUnreadCount(session, input.messages))
    .filter((session) => !input.query.unreadOnly || session.unreadCount > 0);
}

function matchesTagFilter(
  session: CrmWhatsappSession,
  input: {
    query: CountCrmWhatsappSessionsInput;
    tagState: MemoryWhatsappTagState;
  },
) {
  return (
    !input.query.tagIds?.length ||
    input.tagState.sessionTags.some(
      (item) =>
        item.sessionId === session.id &&
        input.query.tagIds!.includes(item.tagId),
    )
  );
}

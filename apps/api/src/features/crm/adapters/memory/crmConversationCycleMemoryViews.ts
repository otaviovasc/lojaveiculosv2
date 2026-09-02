import type {
  CountCrmConversationCyclesInput,
  CrmMessage,
  CrmConversationCycle,
  ListCrmConversationCyclesInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import {
  compareCyclesNewestFirst,
  matchesFilter,
  matchesSearch,
  withUnreadCount,
} from "./crmConversationMemoryQueries.js";
import {
  requireHydratedCycle,
  type MemoryCrmTagState,
} from "./crmTagMemory.js";

export function countMemoryCycles(input: {
  messages: readonly CrmMessage[];
  query: CountCrmConversationCyclesInput;
  cycles: readonly CrmConversationCycle[];
  tagState: MemoryCrmTagState;
}) {
  return filterMemoryCycles(input).length;
}

export function countMemoryCyclesByAssignee(input: {
  messages: readonly CrmMessage[];
  query: CountCrmConversationCyclesInput;
  cycles: readonly CrmConversationCycle[];
  tagState: MemoryCrmTagState;
}) {
  const counts = new Map<
    NonNullable<CrmConversationCycle["assignedUserId"]>,
    number
  >();
  const cycles = filterMemoryCycles({
    ...input,
    query: { ...input.query, filter: "all" },
  });
  cycles.forEach((cycle) => {
    if (!cycle.assignedUserId) return;
    counts.set(
      cycle.assignedUserId,
      (counts.get(cycle.assignedUserId) ?? 0) + 1,
    );
  });
  return Array.from(counts, ([assigneeId, count]) => ({ assigneeId, count }));
}

export function listMemoryCycles(input: {
  messages: readonly CrmMessage[];
  query: ListCrmConversationCyclesInput;
  cycles: readonly CrmConversationCycle[];
  tagState: MemoryCrmTagState;
}) {
  return filterMemoryCycles(input)
    .map((cycle) => requireHydratedCycle(cycle, input.tagState))
    .sort(compareCyclesNewestFirst)
    .slice(input.query.offset, input.query.offset + input.query.limit);
}

function filterMemoryCycles(input: {
  messages: readonly CrmMessage[];
  query: CountCrmConversationCyclesInput;
  cycles: readonly CrmConversationCycle[];
  tagState: MemoryCrmTagState;
}) {
  return input.cycles
    .filter((cycle) => cycle.storeId === input.query.storeId)
    .filter((cycle) => cycle.tenantId === input.query.tenantId)
    .filter((cycle) => input.query.includeDeleted || !cycle.deletedAt)
    .filter((cycle) =>
      input.query.includeArchived
        ? true
        : input.query.archived
          ? Boolean(cycle.archivedAt)
          : !cycle.archivedAt,
    )
    .filter((cycle) => matchesQueueVisibility(cycle, input.query))
    .filter(
      (cycle) =>
        !input.query.connectionId ||
        cycle.connectionId === input.query.connectionId,
    )
    .filter(
      (cycle) => !input.query.leadId || cycle.leadId === input.query.leadId,
    )
    .filter((cycle) => !input.query.cycleId || cycle.id === input.query.cycleId)
    .filter(
      (cycle) => !input.query.status || cycle.status === input.query.status,
    )
    .filter(
      (cycle) =>
        !input.query.humanAttendanceState ||
        cycle.humanAttendanceState === input.query.humanAttendanceState,
    )
    .filter((cycle) => matchesTagFilter(cycle, input))
    .filter((cycle) => matchesFilter(cycle, input.query))
    .filter((cycle) => matchesSearch(cycle, input.query.search))
    .map((cycle) => withUnreadCount(cycle, input.messages))
    .filter((cycle) => !input.query.unreadOnly || cycle.unreadCount > 0);
}

function matchesQueueVisibility(
  cycle: CrmConversationCycle,
  query: CountCrmConversationCyclesInput,
) {
  switch (query.queueVisibility?.kind) {
    case undefined:
    case "global":
      return true;
    case "assigned":
      return cycle.assignedUserId === query.queueVisibility.userId;
    case "none":
      return false;
  }
}

function matchesTagFilter(
  cycle: CrmConversationCycle,
  input: {
    query: CountCrmConversationCyclesInput;
    tagState: MemoryCrmTagState;
  },
) {
  return (
    !input.query.tagIds?.length ||
    input.tagState.cycleTags.some(
      (item) =>
        item.cycleId === cycle.id && input.query.tagIds!.includes(item.tagId),
    )
  );
}

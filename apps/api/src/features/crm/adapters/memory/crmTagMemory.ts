import type {
  CrmMessage,
  CrmConversationCycle,
  UpdateCrmConversationCycleTagInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import { updateMemoryCrmConversationCycle } from "./crmConversationMemoryMutations.js";
import {
  compareMemoryTags,
  type MemoryCrmTagState,
} from "./crmTagCatalogMemory.js";

export {
  createMemoryTag,
  deleteMemoryTag,
  findOrCreateMemoryTag,
  listMemoryTags,
  reorderMemoryTags,
  updateMemoryTag,
} from "./crmTagCatalogMemory.js";
export type { MemoryCrmTagState } from "./crmTagCatalogMemory.js";

export function addMemoryCycleTag(
  state: MemoryCrmTagState,
  cycles: CrmConversationCycle[],
  messages: CrmMessage[],
  input: UpdateCrmConversationCycleTagInput,
) {
  const cycle = findScopedCycle(cycles, input);
  if (!cycle) return null;
  if (!hasTagForCycle(state, cycle, input.tagId)) {
    return hydrateCycleTags(cycle, state);
  }
  if (state.cycleTags.some((item) => sameCycleTag(item, input))) {
    return hydrateCycleTags(findScopedCycle(cycles, input), state);
  }
  state.cycleTags.push({
    cycleId: input.cycleId,
    tagId: input.tagId,
  });
  return hydrateCycleTags(
    updateMemoryCrmConversationCycle(cycles, messages, {
      cycleId: input.cycleId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    }),
    state,
  );
}

export function hydrateCycleTags(
  cycle: CrmConversationCycle | null,
  state: MemoryCrmTagState,
) {
  if (!cycle) return null;
  const tagIds = new Set(
    state.cycleTags
      .filter((item) => item.cycleId === cycle.id)
      .map((item) => item.tagId),
  );
  return {
    ...cycle,
    tags: state.tags
      .filter(
        (tag) =>
          tagIds.has(tag.id) &&
          tag.storeId === cycle.storeId &&
          tag.tenantId === cycle.tenantId &&
          (tag.connectionId === null ||
            tag.connectionId === cycle.connectionId),
      )
      .sort(compareMemoryTags),
  };
}

export function removeMemoryCycleTag(
  state: MemoryCrmTagState,
  cycles: CrmConversationCycle[],
  messages: CrmMessage[],
  input: UpdateCrmConversationCycleTagInput,
) {
  const cycle = findScopedCycle(cycles, input);
  if (!cycle) return null;
  if (!hasTagForCycle(state, cycle, input.tagId)) {
    return hydrateCycleTags(cycle, state);
  }
  const index = state.cycleTags.findIndex((item) => sameCycleTag(item, input));
  if (index < 0) {
    return hydrateCycleTags(findScopedCycle(cycles, input), state);
  }
  state.cycleTags.splice(index, 1);
  return hydrateCycleTags(
    updateMemoryCrmConversationCycle(cycles, messages, {
      cycleId: input.cycleId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    }),
    state,
  );
}

export function requireHydratedCycle(
  cycle: CrmConversationCycle,
  state: MemoryCrmTagState,
) {
  return hydrateCycleTags(cycle, state)!;
}

function findScopedCycle(
  cycles: readonly CrmConversationCycle[],
  input: UpdateCrmConversationCycleTagInput,
) {
  return (
    cycles.find(
      (cycle) =>
        cycle.id === input.cycleId &&
        cycle.storeId === input.storeId &&
        cycle.tenantId === input.tenantId,
    ) ?? null
  );
}

function hasTagForCycle(
  state: MemoryCrmTagState,
  cycle: CrmConversationCycle,
  tagId: string,
) {
  return state.tags.some(
    (tag) =>
      tag.id === tagId &&
      tag.storeId === cycle.storeId &&
      tag.tenantId === cycle.tenantId &&
      (tag.connectionId === null || tag.connectionId === cycle.connectionId),
  );
}

function sameCycleTag(
  item: { cycleId: string; tagId: string },
  input: { cycleId: string; tagId: string },
) {
  return item.cycleId === input.cycleId && item.tagId === input.tagId;
}

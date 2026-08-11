import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
  UpdateCrmWhatsappSessionTagInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import { updateMemoryWhatsappSession } from "./crmWhatsappMemoryMutations.js";
import {
  compareMemoryTags,
  type MemoryWhatsappTagState,
} from "./crmWhatsappMemoryTagCatalog.js";

export {
  createMemoryTag,
  deleteMemoryTag,
  findOrCreateMemoryTag,
  listMemoryTags,
  reorderMemoryTags,
  updateMemoryTag,
} from "./crmWhatsappMemoryTagCatalog.js";
export type { MemoryWhatsappTagState } from "./crmWhatsappMemoryTagCatalog.js";

export function addMemorySessionTag(
  state: MemoryWhatsappTagState,
  sessions: CrmWhatsappSession[],
  messages: CrmWhatsappMessage[],
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const session = findScopedSession(sessions, input);
  if (!session) return null;
  if (!hasTagForSession(state, session, input.tagId)) {
    return hydrateSessionTags(session, state);
  }
  if (state.sessionTags.some((item) => sameSessionTag(item, input))) {
    return hydrateSessionTags(findScopedSession(sessions, input), state);
  }
  state.sessionTags.push({
    sessionId: input.sessionId,
    tagId: input.tagId,
  });
  return hydrateSessionTags(
    updateMemoryWhatsappSession(sessions, messages, {
      sessionId: input.sessionId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    }),
    state,
  );
}

export function hydrateSessionTags(
  session: CrmWhatsappSession | null,
  state: MemoryWhatsappTagState,
) {
  if (!session) return null;
  const tagIds = new Set(
    state.sessionTags
      .filter((item) => item.sessionId === session.id)
      .map((item) => item.tagId),
  );
  return {
    ...session,
    sessionTags: state.tags
      .filter(
        (tag) =>
          tagIds.has(tag.id) &&
          tag.storeId === session.storeId &&
          tag.tenantId === session.tenantId &&
          (tag.connectionId === null ||
            tag.connectionId === session.connectionId),
      )
      .sort(compareMemoryTags),
  };
}

export function removeMemorySessionTag(
  state: MemoryWhatsappTagState,
  sessions: CrmWhatsappSession[],
  messages: CrmWhatsappMessage[],
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const session = findScopedSession(sessions, input);
  if (!session) return null;
  if (!hasTagForSession(state, session, input.tagId)) {
    return hydrateSessionTags(session, state);
  }
  const index = state.sessionTags.findIndex((item) =>
    sameSessionTag(item, input),
  );
  if (index < 0) {
    return hydrateSessionTags(findScopedSession(sessions, input), state);
  }
  state.sessionTags.splice(index, 1);
  return hydrateSessionTags(
    updateMemoryWhatsappSession(sessions, messages, {
      sessionId: input.sessionId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    }),
    state,
  );
}

export function requireHydratedSession(
  session: CrmWhatsappSession,
  state: MemoryWhatsappTagState,
) {
  return hydrateSessionTags(session, state)!;
}

function findScopedSession(
  sessions: readonly CrmWhatsappSession[],
  input: UpdateCrmWhatsappSessionTagInput,
) {
  return (
    sessions.find(
      (session) =>
        session.id === input.sessionId &&
        session.storeId === input.storeId &&
        session.tenantId === input.tenantId,
    ) ?? null
  );
}

function hasTagForSession(
  state: MemoryWhatsappTagState,
  session: CrmWhatsappSession,
  tagId: string,
) {
  return state.tags.some(
    (tag) =>
      tag.id === tagId &&
      tag.storeId === session.storeId &&
      tag.tenantId === session.tenantId &&
      (tag.connectionId === null || tag.connectionId === session.connectionId),
  );
}

function sameSessionTag(
  item: { sessionId: string; tagId: string },
  input: { sessionId: string; tagId: string },
) {
  return item.sessionId === input.sessionId && item.tagId === input.tagId;
}

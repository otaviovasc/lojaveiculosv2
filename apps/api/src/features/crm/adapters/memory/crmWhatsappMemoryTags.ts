import { randomUUID } from "node:crypto";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
  CrmWhatsappTag,
  FindOrCreateCrmWhatsappTagInput,
  ListCrmWhatsappTagsInput,
  UpdateCrmWhatsappSessionTagInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import { updateMemoryWhatsappSession } from "./crmWhatsappMemoryMutations.js";

export type MemoryWhatsappTagState = {
  sessionTags: Array<{ sessionId: string; tagId: string }>;
  tags: CrmWhatsappTag[];
};

export function addMemorySessionTag(
  state: MemoryWhatsappTagState,
  sessions: CrmWhatsappSession[],
  messages: CrmWhatsappMessage[],
  input: UpdateCrmWhatsappSessionTagInput,
) {
  if (!hasSession(sessions, input)) return null;
  enforceMemoryColumnExclusivity(state, input);
  if (!state.sessionTags.some((item) => sameSessionTag(item, input))) {
    state.sessionTags.push({
      sessionId: input.sessionId,
      tagId: input.tagId,
    });
  }
  return hydrateSessionTags(
    updateMemoryWhatsappSession(sessions, messages, {
      sessionId: input.sessionId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    }),
    state,
  );
}

export function findOrCreateMemoryTag(
  state: MemoryWhatsappTagState,
  input: FindOrCreateCrmWhatsappTagInput,
) {
  const existing = state.tags.find(
    (tag) =>
      tag.storeId === input.storeId &&
      tag.tenantId === input.tenantId &&
      tag.connectionId === (input.connectionId ?? null) &&
      tag.name.toLocaleLowerCase("pt-BR") ===
        input.name.toLocaleLowerCase("pt-BR"),
  );
  if (existing) return existing;
  const tag: CrmWhatsappTag = {
    color: input.color ?? "#64748b",
    connectionId: input.connectionId ?? null,
    emoji: input.emoji ?? null,
    id: randomUUID(),
    isColumn: input.isColumn ?? false,
    name: input.name,
    sortOrder: input.sortOrder ?? state.tags.length,
    storeId: input.storeId,
    tenantId: input.tenantId,
  };
  state.tags.push(tag);
  return tag;
}

export function listMemoryTags(
  state: MemoryWhatsappTagState,
  input: ListCrmWhatsappTagsInput,
) {
  const search = input.search?.trim().toLocaleLowerCase("pt-BR");
  return state.tags
    .filter((tag) => tag.storeId === input.storeId)
    .filter((tag) => tag.tenantId === input.tenantId)
    .filter(
      (tag) =>
        input.connectionId === undefined ||
        tag.connectionId === input.connectionId,
    )
    .filter(
      (tag) => !search || tag.name.toLocaleLowerCase("pt-BR").includes(search),
    )
    .sort(compareMemoryTags)
    .slice(0, input.limit);
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
    sessionTags: state.tags.filter((tag) => tagIds.has(tag.id)),
  };
}

export function removeMemorySessionTag(
  state: MemoryWhatsappTagState,
  sessions: CrmWhatsappSession[],
  messages: CrmWhatsappMessage[],
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const index = state.sessionTags.findIndex((item) =>
    sameSessionTag(item, input),
  );
  if (index >= 0) state.sessionTags.splice(index, 1);
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

function hasSession(
  sessions: readonly CrmWhatsappSession[],
  input: UpdateCrmWhatsappSessionTagInput,
) {
  return sessions.some(
    (session) =>
      session.id === input.sessionId &&
      session.storeId === input.storeId &&
      session.tenantId === input.tenantId,
  );
}

function sameSessionTag(
  item: { sessionId: string; tagId: string },
  input: { sessionId: string; tagId: string },
) {
  return item.sessionId === input.sessionId && item.tagId === input.tagId;
}

function enforceMemoryColumnExclusivity(
  state: MemoryWhatsappTagState,
  input: UpdateCrmWhatsappSessionTagInput,
) {
  const tag = state.tags.find((item) => item.id === input.tagId);
  if (!tag?.isColumn) return;
  const columnTagIds = new Set(
    state.tags
      .filter((item) => item.isColumn)
      .filter((item) => item.id !== input.tagId)
      .map((item) => item.id),
  );
  state.sessionTags = state.sessionTags.filter(
    (item) =>
      item.sessionId !== input.sessionId || !columnTagIds.has(item.tagId),
  );
}

function compareMemoryTags(left: CrmWhatsappTag, right: CrmWhatsappTag) {
  if (left.isColumn !== right.isColumn) return left.isColumn ? -1 : 1;
  if (left.sortOrder !== right.sortOrder)
    return left.sortOrder - right.sortOrder;
  return left.name.localeCompare(right.name, "pt-BR");
}

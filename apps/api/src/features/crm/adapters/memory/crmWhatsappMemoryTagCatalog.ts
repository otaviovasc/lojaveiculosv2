import { randomUUID } from "node:crypto";
import type {
  CrmWhatsappTag,
  CreateCrmWhatsappTagInput,
  DeleteCrmWhatsappTagInput,
  FindOrCreateCrmWhatsappTagInput,
  ListCrmWhatsappTagsInput,
  ReorderCrmWhatsappTagsInput,
  UpdateCrmWhatsappTagInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";

export type MemoryWhatsappTagState = {
  sessionTags: Array<{ sessionId: string; tagId: string }>;
  tags: CrmWhatsappTag[];
};

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
    name: input.name,
    sortOrder: input.sortOrder ?? state.tags.length,
    storeId: input.storeId,
    tenantId: input.tenantId,
  };
  state.tags.push(tag);
  return tag;
}

export function createMemoryTag(
  state: MemoryWhatsappTagState,
  input: CreateCrmWhatsappTagInput,
) {
  return findOrCreateMemoryTag(state, input);
}

export function updateMemoryTag(
  state: MemoryWhatsappTagState,
  input: UpdateCrmWhatsappTagInput,
) {
  const tag = state.tags.find(
    (item) =>
      item.id === input.id &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId,
  );
  if (!tag) return null;
  if (input.color !== undefined) tag.color = input.color;
  if (input.emoji !== undefined) tag.emoji = input.emoji;
  if (input.name !== undefined) tag.name = input.name;
  if (input.sortOrder !== undefined) tag.sortOrder = input.sortOrder;
  return tag;
}

export function deleteMemoryTag(
  state: MemoryWhatsappTagState,
  input: DeleteCrmWhatsappTagInput,
) {
  const index = state.tags.findIndex(
    (tag) =>
      tag.id === input.id &&
      tag.storeId === input.storeId &&
      tag.tenantId === input.tenantId,
  );
  if (index < 0) return null;
  const [deleted] = state.tags.splice(index, 1);
  state.sessionTags = state.sessionTags.filter(
    (item) => item.tagId !== input.id,
  );
  return deleted ?? null;
}

export function reorderMemoryTags(
  state: MemoryWhatsappTagState,
  input: ReorderCrmWhatsappTagsInput,
) {
  for (const [sortOrder, tagId] of input.tagIds.entries()) {
    const tag = state.tags.find(
      (item) =>
        item.id === tagId &&
        item.storeId === input.storeId &&
        item.tenantId === input.tenantId,
    );
    if (tag) tag.sortOrder = sortOrder;
  }
  return listMemoryTags(state, {
    limit: state.tags.length,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
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

export function compareMemoryTags(left: CrmWhatsappTag, right: CrmWhatsappTag) {
  if (left.sortOrder !== right.sortOrder)
    return left.sortOrder - right.sortOrder;
  return left.name.localeCompare(right.name, "pt-BR");
}

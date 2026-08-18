import type {
  CrmQuickMessage as PersistedCrmQuickMessage,
  CrmQuickMessageKind,
} from "../../ports/crmQuickMessageRepository.js";

export type CrmQuickMessage = {
  content: string;
  createdAt: Date | null;
  id: string;
  isSystem: boolean;
  kind: CrmQuickMessageKind;
  mediaType: string | null;
  mediaUrl: string | null;
  shortcut: string;
  sortOrder: number;
  title: string;
  updatedAt: Date | null;
};

export const defaultCrmQuickMessages: readonly CrmQuickMessage[] = [];

export function toCrmQuickMessage(
  message: PersistedCrmQuickMessage,
): CrmQuickMessage {
  return {
    content: message.content,
    createdAt: message.createdAt,
    id: message.id,
    isSystem: false,
    kind: message.kind,
    mediaType: message.mediaType,
    mediaUrl: message.mediaUrl,
    shortcut: `/${message.shortcut.replace(/^\/+/, "")}`,
    sortOrder: message.sortOrder,
    title: message.title,
    updatedAt: message.updatedAt,
  };
}

export function normalizeQuickMessageShortcut(shortcut: string) {
  return shortcut
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/^\/+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .slice(0, 50);
}

import type {
  CrmWhatsappQuickMessage,
  CrmWhatsappQuickMessageKind,
} from "../../ports/crmWhatsappRepository.js";

export type WhatsappQuickMessage = {
  content: string;
  createdAt: Date | null;
  id: string;
  isSystem: boolean;
  kind: CrmWhatsappQuickMessageKind;
  mediaType: string | null;
  mediaUrl: string | null;
  shortcut: string;
  sortOrder: number;
  title: string;
  updatedAt: Date | null;
};

export const defaultWhatsappQuickMessages: readonly WhatsappQuickMessage[] = [];

export function toWhatsappQuickMessage(
  message: CrmWhatsappQuickMessage,
): WhatsappQuickMessage {
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

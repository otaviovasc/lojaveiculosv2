import type { CrmMessage } from "./crmConversationTypes";

const mediaPreview = {
  AUDIO: { emoji: "🎵", label: "Áudio" },
  CATALOG: { emoji: "🛍️", label: "Catálogo" },
  CONTACT: { emoji: "👤", label: "Contato" },
  DOCUMENT: { emoji: "📄", label: "Documento" },
  IMAGE: { emoji: "🖼️", label: "Imagem" },
  LOCATION: { emoji: "📍", label: "Localização" },
  STICKER: { emoji: "😊", label: "Figurinha" },
  VIDEO: { emoji: "🎬", label: "Vídeo" },
} as const;

type PreviewMediaType = keyof typeof mediaPreview;

const legacyPlaceholderPattern =
  /^(?<prefix>Eu:\s*)?\[(?<type>audio|catalog|contact|document|image|location|sticker|video)\]$/iu;

/** Formats both current message DTOs and exact historical media placeholders. */
export function formatLastMessagePreview(input: {
  content?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  type?: CrmMessage["type"] | undefined;
}) {
  const content = input.content?.trim() ?? "";
  if (input.type && input.type in mediaPreview) {
    const type = input.type as PreviewMediaType;
    const detail = readMediaDetail(input.metadata, type, content);
    return formatMediaPreview(type, detail);
  }

  const legacy = legacyPlaceholderPattern.exec(content);
  if (legacy?.groups?.type) {
    const type = legacy.groups.type.toUpperCase() as PreviewMediaType;
    return `${legacy.groups.prefix ?? ""}${formatMediaPreview(type)}`;
  }
  return content;
}

export function formatSentPreview(message: CrmMessage) {
  return `Eu: ${formatLastMessagePreview(message)}`;
}

function formatMediaPreview(type: PreviewMediaType, detail?: string) {
  const presentation = mediaPreview[type];
  return `${presentation.emoji} ${detail || presentation.label}`;
}

function readMediaDetail(
  metadata: Record<string, unknown> | undefined,
  type: PreviewMediaType,
  content: string,
) {
  const media = readRecord(readRecord(metadata).media);
  const metadataDetail =
    type === "DOCUMENT"
      ? readString(media.fileName)
      : readString(media.caption);
  if (metadataDetail) return metadataDetail;
  if (!content || legacyPlaceholderPattern.test(content)) return undefined;
  const genericLabel = mediaPreview[type].label;
  return content.localeCompare(genericLabel, "pt-BR", {
    sensitivity: "base",
  }) === 0
    ? undefined
    : content;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

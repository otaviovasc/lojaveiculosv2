import type { CrmMessageType } from "../ports/crmConversationRepository.js";
import {
  cleanRecord,
  readNumber,
  readRecord,
  readString,
} from "./zapiPayloadRead.js";
import type { ExtractedUazapiInboundContent } from "./uazapiInboundContent.js";

export function mediaContent(
  type: Extract<
    CrmMessageType,
    "AUDIO" | "DOCUMENT" | "IMAGE" | "STICKER" | "VIDEO"
  >,
  node: Record<string, unknown>,
  mediaUrl: string | undefined,
  details: {
    caption?: string | undefined;
    fileName?: string | undefined;
    mimeType?: string | undefined;
  },
): ExtractedUazapiInboundContent | null {
  if (!mediaUrl) return null;
  const content =
    details.caption ?? details.fileName ?? `[${type.toLowerCase()}]`;
  return {
    content,
    mediaType: type.toLowerCase(),
    mediaUrl,
    metadata: {
      media: cleanRecord({
        caption: details.caption,
        fileName: details.fileName,
        mimeType: details.mimeType,
        seconds: readNumber(node.seconds) ?? readNumber(node.duration),
        viewOnce: node.viewOnce === true ? true : undefined,
      }),
    },
    type,
  };
}

export function locationContent(
  location: Record<string, unknown>,
  text?: string,
): ExtractedUazapiInboundContent | null {
  const name = readString(location.name);
  const address = readString(location.address);
  const latitude = readNumber(location.degreesLatitude);
  const longitude = readNumber(location.degreesLongitude);
  if (!name && !address && latitude === undefined && longitude === undefined) {
    return text ? { content: text, metadata: {}, type: "TEXT" } : null;
  }
  return {
    content: name ?? address ?? `${latitude ?? ""},${longitude ?? ""}`,
    metadata: {
      location: cleanRecord({ address, latitude, longitude, name }),
    },
    type: "LOCATION",
  };
}

export function contactContent(
  contact: Record<string, unknown>,
  text?: string,
): ExtractedUazapiInboundContent | null {
  const displayName = readString(contact.displayName);
  const vcard = readString(contact.vcard) ?? readString(contact.vCard);
  const content = displayName ?? vcard ?? text;
  if (!content) return null;
  return {
    content,
    metadata: { contact: cleanRecord({ displayName, vcard }) },
    type: "CONTACT",
  };
}

export function reactionContent(
  content: Record<string, unknown> | null,
  data: Record<string, unknown>,
  text?: string,
): ExtractedUazapiInboundContent | null {
  const reaction = readRecord(content?.reactionMessage);
  const key = readRecord(reaction.key ?? content?.key);
  const value =
    readString(reaction.text) ??
    readString(content?.text) ??
    text ??
    (typeof data.reaction === "string" ? readString(data.reaction) : undefined);
  const messageId = readString(key.id);
  if (!value && !messageId) return null;
  return {
    content: `Reaction${value ? `: ${value}` : ""}`,
    metadata: {
      interactive: cleanRecord({
        kind: "reaction",
        messageId,
        value,
      }),
    },
    type: "INTERACTIVE",
  };
}

export function interactiveContent(
  kind: "button" | "list",
  message: string,
  details: { id?: string | undefined; title?: string | undefined },
): ExtractedUazapiInboundContent {
  return {
    content: message,
    metadata: { interactive: cleanRecord({ ...details, kind }) },
    type: "INTERACTIVE",
  };
}

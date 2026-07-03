import type { CrmWhatsappMessageType } from "../ports/crmWhatsappRepository.js";
import { readNumber, readRecord, readString } from "./zapiPayloadRead.js";

export type ExtractedZapiInboundContent = {
  content: string;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  type: CrmWhatsappMessageType;
};

export function extractZapiInboundContent(
  payload: Record<string, unknown>,
): ExtractedZapiInboundContent | null {
  const text = readRecord(payload.text);
  const textMessage = readString(text.message);
  if (textMessage) {
    return { content: textMessage, metadata: {}, type: "TEXT" };
  }

  const image = readRecord(payload.image);
  const imageUrl = firstString(image, ["imageUrl", "mediaUrl", "url"]);
  if (imageUrl) return mediaContent("IMAGE", image, imageUrl);

  const audio = readRecord(payload.audio);
  const audioUrl = firstString(audio, ["audioUrl", "mediaUrl", "url"]);
  if (audioUrl) return mediaContent("AUDIO", audio, audioUrl);

  const video = readRecord(payload.video);
  const videoUrl = firstString(video, ["videoUrl", "mediaUrl", "url"]);
  if (videoUrl) return mediaContent("VIDEO", video, videoUrl);

  const document = readRecord(payload.document);
  const documentUrl = firstString(document, ["documentUrl", "mediaUrl", "url"]);
  if (documentUrl) return mediaContent("DOCUMENT", document, documentUrl);

  const sticker = readRecord(payload.sticker);
  const stickerUrl = firstString(sticker, ["mediaUrl", "stickerUrl", "url"]);
  if (stickerUrl) return mediaContent("STICKER", sticker, stickerUrl);

  const location = readRecord(payload.location);
  if (Object.keys(location).length) return locationContent(location);

  const contact = readRecord(payload.contact);
  if (Object.keys(contact).length) return contactContent(contact);

  const reaction = readRecord(payload.reaction);
  if (Object.keys(reaction).length) {
    return {
      content: `Reaction${reaction.value ? `: ${String(reaction.value)}` : ""}`,
      metadata: {
        interactive: cleanRecord({
          kind: "reaction",
          messageId: readString(reaction.messageId),
          value: readString(reaction.value),
        }),
      },
      type: "INTERACTIVE",
    };
  }
  return extractInteractiveContent(payload);
}

function mediaContent(
  type: Extract<
    CrmWhatsappMessageType,
    "AUDIO" | "DOCUMENT" | "IMAGE" | "STICKER" | "VIDEO"
  >,
  source: Record<string, unknown>,
  mediaUrl: string,
): ExtractedZapiInboundContent {
  const caption = firstString(source, ["caption", "message"]);
  const fileName = firstString(source, ["fileName", "filename", "title"]);
  const content = caption ?? fileName ?? `[${type.toLowerCase()}]`;
  return {
    content,
    mediaType: type.toLowerCase(),
    mediaUrl,
    metadata: {
      media: cleanRecord({
        caption,
        fileName,
        height: firstNumber(source, ["height"]),
        mimeType: firstString(source, ["mimeType", "mimetype"]),
        seconds: firstNumber(source, ["seconds", "duration"]),
        sha256: firstString(source, ["sha256", "fileSha256"]),
        thumbnailUrl: firstString(source, ["thumbnailUrl", "jpegThumbnail"]),
        viewOnce: source.viewOnce === true ? true : undefined,
        width: firstNumber(source, ["width"]),
      }),
    },
    type,
  };
}

function locationContent(
  location: Record<string, unknown>,
): ExtractedZapiInboundContent {
  const name = readString(location.name);
  const address = readString(location.address);
  const url = readString(location.url);
  const latitude = readNumber(location.latitude);
  const longitude = readNumber(location.longitude);
  return {
    content: name ?? address ?? url ?? `${latitude ?? ""},${longitude ?? ""}`,
    metadata: {
      location: cleanRecord({ address, latitude, longitude, name, url }),
    },
    type: "LOCATION",
  };
}

function contactContent(
  contact: Record<string, unknown>,
): ExtractedZapiInboundContent {
  const displayName =
    readString(contact.displayName) ??
    readString(contact.name) ??
    readString(contact.fullName);
  const phone = firstString(contact, ["phone", "phoneNumber", "waId"]);
  const vcard = readString(contact.vcard) ?? readString(contact.vCard);
  return {
    content: displayName ?? phone ?? vcard ?? "Contact",
    metadata: {
      contact: cleanRecord({ displayName, phone, vcard }),
    },
    type: "CONTACT",
  };
}

function extractInteractiveContent(payload: Record<string, unknown>) {
  const poll = readRecord(payload.poll);
  if (Object.keys(poll).length) {
    const question = readString(poll.question) ?? "";
    return {
      content: `Poll: ${question}`,
      metadata: { interactive: cleanRecord({ kind: "poll", question }) },
      type: "INTERACTIVE" as const,
    };
  }
  const buttons = readRecord(payload.buttonsResponseMessage);
  if (buttons.message) {
    return interactiveReplyContent("button", String(buttons.message));
  }
  const list = readRecord(payload.listResponseMessage);
  if (list.message)
    return interactiveReplyContent("list", String(list.message));
  return null;
}

function interactiveReplyContent(kind: string, message: string) {
  return {
    content: message,
    metadata: { interactive: { kind } },
    type: "INTERACTIVE" as const,
  };
}

function firstString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readString(source[key]);
    if (value) return value;
  }
  return undefined;
}

function firstNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readNumber(source[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function cleanRecord(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

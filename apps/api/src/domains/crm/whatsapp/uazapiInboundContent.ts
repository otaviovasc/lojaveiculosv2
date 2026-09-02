import type { CrmMessageType } from "../ports/crmConversationRepository.js";
import { readRecord, readString } from "./zapiPayloadRead.js";
import { parseUazapiContent } from "./uazapiPayloadData.js";
import {
  contactContent,
  interactiveContent,
  locationContent,
  mediaContent,
  reactionContent,
} from "./uazapiInboundContentSupport.js";

export type ExtractedUazapiInboundContent = {
  content: string;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  type: CrmMessageType;
};

export function extractUazapiInboundContent(
  data: Record<string, unknown>,
): ExtractedUazapiInboundContent | null {
  const content = parseUazapiContent(data.content);
  const messageType = normalizeUazapiMessageType(
    readString(data.messageType) ?? inferUazapiMessageType(content),
  );
  const mediaUrl = readString(data.fileURL);
  const mimeType = readString(data.mimetype);
  const text = readString(data.text);
  const caption = readString(data.caption) ?? text;

  switch (messageType) {
    case "conversation":
    case "extendedTextMessage": {
      const value =
        text ??
        readString(content?.conversation) ??
        readString(readRecord(content?.extendedTextMessage).text);
      return value ? { content: value, metadata: {}, type: "TEXT" } : null;
    }
    case "imageMessage": {
      const node = readRecord(content?.imageMessage);
      return mediaContent("IMAGE", node, mediaUrl ?? readString(node.url), {
        caption: readString(node.caption) ?? caption,
        mimeType: mimeType ?? readString(node.mimetype),
      });
    }
    case "audioMessage": {
      const node = readRecord(content?.audioMessage);
      return mediaContent("AUDIO", node, mediaUrl ?? readString(node.url), {
        mimeType: mimeType ?? readString(node.mimetype),
      });
    }
    case "videoMessage": {
      const node = readRecord(content?.videoMessage);
      return mediaContent("VIDEO", node, mediaUrl ?? readString(node.url), {
        caption: readString(node.caption) ?? caption,
        mimeType: mimeType ?? readString(node.mimetype),
      });
    }
    case "documentMessage":
    case "documentWithCaptionMessage": {
      const node = readRecord(content?.documentMessage);
      return mediaContent("DOCUMENT", node, mediaUrl ?? readString(node.url), {
        caption:
          readString(node.caption) ??
          readString(node.fileName) ??
          readString(node.title) ??
          caption,
        fileName: readString(node.fileName) ?? readString(node.title),
        mimeType: mimeType ?? readString(node.mimetype),
      });
    }
    case "stickerMessage": {
      const node = readRecord(content?.stickerMessage);
      return mediaContent("STICKER", node, mediaUrl ?? readString(node.url), {
        mimeType: mimeType ?? readString(node.mimetype),
      });
    }
    case "locationMessage":
      return locationContent(readRecord(content?.locationMessage), text);
    case "contactMessage":
    case "contactsArrayMessage":
      return contactContent(readRecord(content?.contactMessage), text);
    case "reactionMessage":
      return reactionContent(content, data, text);
    case "buttonsResponseMessage": {
      const node = readRecord(content?.buttonsResponseMessage);
      const value = readString(node.selectedDisplayText) ?? text;
      if (!value) return null;
      return interactiveContent("button", value, {
        id:
          readString(node.selectedButtonId) ?? readString(data.buttonOrListid),
      });
    }
    case "listResponseMessage": {
      const node = readRecord(content?.listResponseMessage);
      const value =
        readString(node.title) ?? readString(node.description) ?? text;
      if (!value) return null;
      return interactiveContent("list", value, {
        id:
          readString(readRecord(node.singleSelectReply).selectedRowId) ??
          readString(data.buttonOrListid),
        title: readString(node.title),
      });
    }
    default:
      return text ? { content: text, metadata: {}, type: "TEXT" } : null;
  }
}

export function normalizeUazapiMessageType(value?: string) {
  const normalized = (value ?? "")
    .trim()
    .replace(/[\s_-]/gu, "")
    .toLowerCase();
  const typeMap: Record<string, string> = {
    audio: "audioMessage",
    audiomessage: "audioMessage",
    buttonsresponsemessage: "buttonsResponseMessage",
    contact: "contactMessage",
    contactmessage: "contactMessage",
    contactsarraymessage: "contactsArrayMessage",
    conversation: "conversation",
    document: "documentMessage",
    documentmessage: "documentMessage",
    documentwithcaptionmessage: "documentWithCaptionMessage",
    extendedtext: "extendedTextMessage",
    extendedtextmessage: "extendedTextMessage",
    file: "documentMessage",
    image: "imageMessage",
    imagemessage: "imageMessage",
    listresponsemessage: "listResponseMessage",
    location: "locationMessage",
    locationmessage: "locationMessage",
    myaudio: "audioMessage",
    photo: "imageMessage",
    picture: "imageMessage",
    ptt: "audioMessage",
    reaction: "reactionMessage",
    reactionmessage: "reactionMessage",
    sticker: "stickerMessage",
    stickermessage: "stickerMessage",
    text: "conversation",
    video: "videoMessage",
    videomessage: "videoMessage",
  };
  return typeMap[normalized] ?? value ?? "";
}

function inferUazapiMessageType(content: Record<string, unknown> | null) {
  if (!content) return undefined;
  return Object.keys(content).find(
    (key) => key.endsWith("Message") || key === "conversation",
  );
}

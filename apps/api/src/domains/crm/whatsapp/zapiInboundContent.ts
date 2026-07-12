import type { CrmWhatsappMessageType } from "../ports/crmWhatsappRepository.js";
import {
  cleanRecord,
  firstArrayString,
  firstNumber,
  firstString,
  readNumber,
  readRecord,
  readString,
} from "./zapiPayloadRead.js";

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
  const normalizedLocation = locationContent(location);
  if (normalizedLocation) return normalizedLocation;

  const contact = readRecord(payload.contact);
  const normalizedContact = contactContent(contact);
  if (normalizedContact) return normalizedContact;

  const reaction = readRecord(payload.reaction);
  const reactionMessageId = readString(reaction.messageId);
  const reactionValue = readString(reaction.value);
  if (reactionMessageId || reactionValue) {
    return {
      content: `Reaction${reactionValue ? `: ${reactionValue}` : ""}`,
      metadata: {
        interactive: cleanRecord({
          kind: "reaction",
          messageId: reactionMessageId,
          value: reactionValue,
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
): ExtractedZapiInboundContent | null {
  const name = readString(location.name);
  const address = readString(location.address);
  const url = readString(location.url);
  const latitude = readNumber(location.latitude);
  const longitude = readNumber(location.longitude);
  if (
    !name &&
    !address &&
    !url &&
    latitude === undefined &&
    longitude === undefined
  ) {
    return null;
  }
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
): ExtractedZapiInboundContent | null {
  const displayName =
    readString(contact.displayName) ??
    readString(contact.name) ??
    readString(contact.fullName);
  const phone =
    firstString(contact, ["phone", "phoneNumber", "waId"]) ??
    firstArrayString(contact.phones);
  const vcard = readString(contact.vcard) ?? readString(contact.vCard);
  const content = displayName ?? phone ?? vcard;
  if (!content) return null;
  return {
    content,
    metadata: {
      contact: cleanRecord({ displayName, phone, vcard }),
    },
    type: "CONTACT",
  };
}

function extractInteractiveContent(payload: Record<string, unknown>) {
  const poll = readRecord(payload.poll);
  const question = readString(poll.question);
  if (question) {
    return {
      content: `Poll: ${question}`,
      metadata: { interactive: cleanRecord({ kind: "poll", question }) },
      type: "INTERACTIVE" as const,
    };
  }

  const pollVote = readRecord(payload.pollVote);
  const pollMessageId = readString(pollVote.pollMessageId);
  const options = readPollVoteOptions(pollVote.options);
  if (pollMessageId || options.length) {
    return {
      content: options.length
        ? `Poll vote: ${options.join(", ")}`
        : "Poll vote",
      metadata: {
        interactive: cleanRecord({
          kind: "poll_vote",
          options: options.length ? options : undefined,
          pollMessageId,
        }),
      },
      type: "INTERACTIVE" as const,
    };
  }

  const buttons = readRecord(payload.buttonsResponseMessage);
  const buttonMessage = readString(buttons.message);
  if (buttonMessage) {
    const id = readString(buttons.buttonId);
    return interactiveReplyContent("button", buttonMessage, {
      ...(id ? { id } : {}),
    });
  }

  const list = readRecord(payload.listResponseMessage);
  const listMessage = readString(list.message);
  if (listMessage) {
    const id = readString(list.selectedRowId);
    const title = readString(list.title);
    return interactiveReplyContent("list", listMessage, {
      ...(id ? { id } : {}),
      ...(title ? { title } : {}),
    });
  }
  return null;
}

function interactiveReplyContent(
  kind: "button" | "list",
  message: string,
  details: { id?: string; title?: string },
) {
  return {
    content: message,
    metadata: { interactive: cleanRecord({ ...details, kind }) },
    type: "INTERACTIVE" as const,
  };
}

function readPollVoteOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const name = readString(readRecord(candidate).name);
    return name ? [name] : [];
  });
}

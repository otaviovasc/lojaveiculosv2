import { afterEach, describe, expect, it, vi } from "vitest";
import { parseZapiInboundMessage } from "./parseZapiInboundMessage.js";

const basePayload = {
  messageId: "message-1",
  phone: "5511999999999",
  text: { message: "Ola" },
};

describe("parseZapiInboundMessage boundaries", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { isGroup: true },
    { broadcast: true },
    { isNewsletter: true },
    { waitingMessage: true },
    { notification: true },
    { notification: "CALL_VOICE" },
    { type: "notification" },
  ])("ignores non-conversation payload $type", (payload) => {
    expect(parseZapiInboundMessage({ ...basePayload, ...payload })).toBeNull();
  });

  it("ignores status replies without content but accepts those with content", () => {
    expect(
      parseZapiInboundMessage({
        isStatusReply: true,
        messageId: "status-1",
        phone: "5511999999999",
      }),
    ).toBeNull();
    expect(
      parseZapiInboundMessage({ ...basePayload, isStatusReply: true }),
    ).toMatchObject({ content: "Ola", externalId: "message-1" });
  });

  it("requires message id, phone resolution, and supported content", () => {
    expect(
      parseZapiInboundMessage({ phone: "5511999999999", ...basePayload.text }),
    ).toBeNull();
    expect(
      parseZapiInboundMessage({
        messageId: "message-1",
        phone: "12345678901234567890@lid",
        text: basePayload.text,
      }),
    ).toBeNull();
    expect(
      parseZapiInboundMessage({
        messageId: "message-1",
        phone: "5511999999999",
      }),
    ).toBeNull();
  });

  it("uses the documented numeric millisecond momment timestamp", () => {
    expect(
      parseZapiInboundMessage({ ...basePayload, momment: 1_632_228_955_000 })
        ?.providerTimestamp,
    ).toEqual(new Date(1_632_228_955_000));
  });

  it("accepts numeric-string and ISO momment timestamps", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        momment: "1632228955000",
      })?.providerTimestamp,
    ).toEqual(new Date(1_632_228_955_000));
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        momment: "2026-07-06T13:20:00.000Z",
      })?.providerTimestamp,
    ).toEqual(new Date("2026-07-06T13:20:00.000Z"));
  });

  it("falls back from invalid momment to a seconds timestamp", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        momment: "not-a-date",
        timestamp: "1783029600",
      })?.providerTimestamp,
    ).toEqual(new Date(1_783_029_600_000));
  });

  it("uses the current time only when provider timestamps are unusable", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T12:00:00.000Z"));

    expect(
      parseZapiInboundMessage({
        ...basePayload,
        momment: Number.POSITIVE_INFINITY,
        timestamp: "invalid",
      })?.providerTimestamp,
    ).toEqual(new Date("2026-07-12T12:00:00.000Z"));
  });

  it("normalizes documented poll-vote content end to end", () => {
    expect(
      parseZapiInboundMessage({
        messageId: "poll-vote-1",
        phone: "5511999999999",
        pollVote: {
          options: [{ name: "SUV" }],
          pollMessageId: "poll-1",
        },
      }),
    ).toMatchObject({
      content: "Poll vote: SUV",
      externalId: "poll-vote-1",
      metadata: {
        interactive: {
          kind: "poll_vote",
          options: ["SUV"],
          pollMessageId: "poll-1",
        },
      },
      type: "INTERACTIVE",
    });
  });

  it("uses chatPhone for LID payloads and preserves normalized LID metadata", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        chatLid: "12345678901234567890@lid",
        chatPhone: "+55 (11) 98888-7777",
        phone: "12345678901234567890@lid",
      }),
    ).toMatchObject({
      chatLid: "12345678901234567890@lid",
      metadata: { chatLid: "12345678901234567890@lid" },
      phone: "+5511988887777",
    });
  });

  it("falls back through participant, chat-name, and connected phones for LIDs", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        participantPhone: "5511988880000",
        phone: "12345678901234567890@lid",
      }),
    ).toMatchObject({ phone: "5511988880000" });
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        chatName: "+55 (11) 97777-0000",
        phone: "12345678901234567890@lid",
      }),
    ).toMatchObject({ phone: "5511977770000" });
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        connectedPhone: "5511966660000",
        phone: "1111111",
      }),
    ).toMatchObject({ phone: "5511966660000" });
  });

  it("recognizes a numeric phone that matches chatLid", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        chatLid: "123456789012345@lid",
        chatPhone: "5511944440000",
        phone: "123456789012345",
      }),
    ).toMatchObject({ phone: "5511944440000" });
  });

  it("uses CTWA source phone only when it is explicitly international", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        ctwaContext: { referral: { sourceId: "+55 11 97777-6666" } },
        phone: "invalid",
      }),
    ).toMatchObject({ phone: "+5511977776666" });
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        ctwaContext: { referral: { sourceId: "5511977776666" } },
        phone: "invalid",
      }),
    ).toBeNull();
  });

  it("reads a direct CTWA source id when referral metadata is absent", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        ctwaContext: { sourceId: "+55 11 95555-4444" },
        phone: "invalid",
      }),
    ).toMatchObject({ phone: "+5511955554444" });
  });

  it("uses CTWA phone inside the LID fallback chain", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        ctwaContext: { sourceId: "+55 11 93333-2222" },
        phone: "12345678901234567890@lid",
      }),
    ).toMatchObject({ phone: "+5511933332222" });
  });

  it("falls back from an out-of-range momment to the timestamp", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        momment: 1e308,
        timestamp: 1_783_029_600,
      })?.providerTimestamp,
    ).toEqual(new Date(1_783_029_600_000));
  });

  it("falls back to current time when a numeric timestamp is out of range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T14:00:00.000Z"));

    expect(
      parseZapiInboundMessage({ ...basePayload, timestamp: 1e308 })
        ?.providerTimestamp,
    ).toEqual(new Date("2026-07-12T14:00:00.000Z"));
  });

  it("uses chatName for sent-message buyer identity", () => {
    expect(
      parseZapiInboundMessage({
        ...basePayload,
        chatName: " Loja Cliente ",
        fromMe: true,
        senderName: "Operador",
      }),
    ).toMatchObject({ buyerName: "Loja Cliente", fromMe: true });
  });
});

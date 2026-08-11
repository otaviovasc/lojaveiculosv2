import { describe, expect, it } from "vitest";
import { parseMetaWebhookEvents } from "./parseMetaWebhookEvents.js";
import {
  whatsappStatusValue,
  whatsappValue,
} from "./parseMetaWebhookEvents.testSupport.js";

describe("parseMetaWebhookEvents", () => {
  it("normalizes WhatsApp text messages with native connection identity", () => {
    const events = parseMetaWebhookEvents({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "phone-number-1" },
                messages: [
                  {
                    from: "5511999999999",
                    id: "wamid.message-1",
                    text: { body: "Tenho interesse no carro" },
                    timestamp: "1785175200",
                    type: "text",
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(events).toEqual([
      {
        contactExternalId: "5511999999999",
        direction: "INBOUND",
        externalConnectionId: "phone-number-1",
        externalMessageId: "wamid.message-1",
        kind: "message",
        media: null,
        provider: "composio_whatsapp",
        providerEventKey:
          "meta:composio_whatsapp:message:phone-number-1:wamid.message-1",
        text: "Tenho interesse no carro",
        timestamp: new Date("2026-07-27T18:00:00.000Z"),
      },
    ]);
  });

  it("keeps WhatsApp media as an opaque provider reference", () => {
    const [event] = parseMetaWebhookEvents(
      whatsappValue({
        from: "5511888888888",
        id: "wamid.image-1",
        image: {
          caption: "Documento",
          id: "meta-media-1",
          mime_type: "image/jpeg",
        },
        timestamp: "1785175200",
        type: "image",
      }),
    );

    expect(event).toMatchObject({
      kind: "message",
      media: {
        fileName: null,
        id: "meta-media-1",
        mimeType: "image/jpeg",
        type: "image",
        url: null,
      },
      text: "Documento",
    });
  });

  it("normalizes every supported WhatsApp delivery status", () => {
    const statuses = ["sent", "delivered", "read", "failed"];
    const events = parseMetaWebhookEvents(whatsappStatusValue(...statuses));

    expect(
      events.map((event) => event.kind === "status" && event.status),
    ).toEqual(["SENT", "DELIVERED", "READ", "FAILED"]);
    expect(events[1]?.providerEventKey).toBe(
      "meta:composio_whatsapp:status:DELIVERED:phone-number-1:wamid.delivered",
    );
  });

  it("normalizes Instagram inbound messages and outbound echoes", () => {
    const events = parseMetaWebhookEvents({
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              message: { mid: "ig-mid-1", text: "Ainda está disponível?" },
              recipient: { id: "ig-business-1" },
              sender: { id: "ig-contact-1" },
              timestamp: 1785175200000,
            },
            {
              message: { is_echo: true, mid: "ig-echo-1", text: "Resposta" },
              recipient: { id: "ig-contact-1" },
              sender: { id: "ig-business-1" },
              timestamp: 1785175200000,
            },
            {
              read: { mid: "ig-mid-1", watermark: 1785175260000 },
              recipient: { id: "ig-business-1" },
              sender: { id: "ig-contact-1" },
              timestamp: 1785175260000,
            },
          ],
        },
        {
          id: "ig-business-2",
          messaging: [
            {
              message: {
                attachments: [
                  {
                    payload: {
                      url: "https://lookaside.instagram.test/media-1",
                    },
                    type: "image",
                  },
                ],
                mid: "ig-mid-2",
              },
              recipient: { id: "ig-business-2" },
              sender: { id: "ig-contact-2" },
              timestamp: 1785175260000,
            },
          ],
        },
      ],
    });

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      contactExternalId: "ig-contact-1",
      externalConnectionId: "ig-business-1",
      externalMessageId: "ig-mid-1",
      direction: "INBOUND",
      kind: "message",
      provider: "composio_instagram",
      text: "Ainda está disponível?",
    });
    expect(events[1]).toMatchObject({
      contactExternalId: "ig-contact-1",
      direction: "OUTBOUND",
      externalMessageId: "ig-echo-1",
      text: "Resposta",
    });
    expect(events[2]).toMatchObject({
      direction: "INBOUND",
      media: {
        id: null,
        type: "image",
        url: "https://lookaside.instagram.test/media-1",
      },
      text: null,
    });
  });

  it("marks an explicit WhatsApp echo outbound without claiming a human sender", () => {
    const [event] = parseMetaWebhookEvents(
      whatsappValue({
        from: "phone-number-1",
        id: "wamid.echo-1",
        is_echo: true,
        text: { body: "Resposta externa" },
        timestamp: "1785175200",
        to: "5511999999999",
        type: "text",
      }),
    );

    expect(event).toMatchObject({
      contactExternalId: "5511999999999",
      direction: "OUTBOUND",
      externalMessageId: "wamid.echo-1",
      kind: "message",
    });
  });

  it("fails closed for unknown, incomplete, or invalid event shapes", () => {
    const duplicate = {
      from: "5511999999999",
      id: "wamid.duplicate",
      text: { body: "Olá" },
      timestamp: "1785175200",
      type: "text",
    };
    expect(parseMetaWebhookEvents(null)).toEqual([]);
    expect(parseMetaWebhookEvents({ object: "page", entry: [] })).toEqual([]);
    expect(
      parseMetaWebhookEvents(whatsappValue(duplicate, duplicate)),
    ).toHaveLength(1);
    expect(
      parseMetaWebhookEvents({
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  metadata: {},
                  messages: [{ from: "5511999999999", id: "wamid.no-account" }],
                },
              },
            ],
          },
        ],
      }),
    ).toEqual([]);
    const [event] = parseMetaWebhookEvents(
      whatsappValue({
        from: "5511999999999",
        id: "wamid.no-time",
        text: { body: "Sem horário" },
        timestamp: "not-a-date",
        type: "text",
      }),
    );

    expect(event?.timestamp).toBeNull();
  });
});

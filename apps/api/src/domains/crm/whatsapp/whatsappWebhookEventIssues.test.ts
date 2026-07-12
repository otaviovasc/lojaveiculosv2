import { describe, expect, it } from "vitest";
import type { CrmProviderWebhookEvent } from "../ports/crmWebhookEventRepository.js";
import {
  readWebhookEventAttentionReason,
  readZapiWebhookType,
  toWebhookEventSummary,
} from "./whatsappWebhookEventIssues.js";

const baseEvent: CrmProviderWebhookEvent = {
  connectionId: "connection-1",
  createdAt: new Date("2026-07-12T10:00:00.000Z"),
  environment: "test",
  errorMessage: null,
  eventType: "crm.whatsapp.zapi.received",
  id: "event-1",
  payload: {
    messageId: "message-1",
    pollVote: { options: [{ name: "SUV" }], pollMessageId: "poll-1" },
    type: "ReceivedCallback",
  },
  processedAt: null,
  provider: "zapi",
  providerEventId: "provider-event-1",
  status: "ignored",
  storeId: null,
  tenantId: null,
  updatedAt: new Date("2026-07-12T10:01:00.000Z"),
};

describe("whatsappWebhookEventIssues", () => {
  it("flags ignored documented poll-vote payloads for operator attention", () => {
    expect(readWebhookEventAttentionReason(baseEvent)).toBe(
      "received_message_ignored",
    );
    expect(toWebhookEventSummary(baseEvent)).toEqual({
      attentionReason: "received_message_ignored",
      connectionId: "connection-1",
      createdAt: "2026-07-12T10:00:00.000Z",
      errorMessage: null,
      eventType: "crm.whatsapp.zapi.received",
      id: "event-1",
      processedAt: null,
      providerEventId: "provider-event-1",
      retryable: true,
      status: "ignored",
      updatedAt: "2026-07-12T10:01:00.000Z",
      webhookType: "received",
    });
  });

  it("marks failures for attention without claiming unknown events are retryable", () => {
    const event: CrmProviderWebhookEvent = {
      ...baseEvent,
      errorMessage: "provider failed",
      eventType: "other.provider.event",
      processedAt: new Date("2026-07-12T10:02:00.000Z"),
      status: "failed",
    };

    expect(readWebhookEventAttentionReason(event)).toBe("processing_failed");
    expect(toWebhookEventSummary(event)).toMatchObject({
      attentionReason: "processing_failed",
      processedAt: "2026-07-12T10:02:00.000Z",
      retryable: false,
      webhookType: null,
    });
  });

  it.each([
    { eventType: "crm.whatsapp.zapi.delivery", payload: baseEvent.payload },
    { eventType: baseEvent.eventType, payload: {} },
    {
      eventType: baseEvent.eventType,
      payload: { ...baseEvent.payload, broadcast: true },
    },
    {
      eventType: baseEvent.eventType,
      payload: { ...baseEvent.payload, isGroup: true },
    },
    {
      eventType: baseEvent.eventType,
      payload: { ...baseEvent.payload, isNewsletter: true },
    },
    {
      eventType: baseEvent.eventType,
      payload: { ...baseEvent.payload, waitingMessage: true },
    },
    {
      eventType: baseEvent.eventType,
      payload: { ...baseEvent.payload, type: "DeliveryCallback" },
    },
  ])("does not flag ignored non-message event %#", ({ eventType, payload }) => {
    expect(
      readWebhookEventAttentionReason({ ...baseEvent, eventType, payload }),
    ).toBeNull();
  });

  it("accepts msgId and a missing callback type when detecting message payloads", () => {
    expect(
      readWebhookEventAttentionReason({
        ...baseEvent,
        payload: { msgId: "message-2", text: { message: "Ola" } },
      }),
    ).toBe("received_message_ignored");
  });

  it("returns no attention reason for successfully processed events", () => {
    expect(
      readWebhookEventAttentionReason({ ...baseEvent, status: "processed" }),
    ).toBeNull();
  });

  it.each([
    "chat_presence",
    "connected",
    "delivery",
    "disconnected",
    "received",
    "status",
  ] as const)("reads the supported ZAPI %s event type", (type) => {
    expect(readZapiWebhookType(`crm.whatsapp.zapi.${type}`)).toBe(type);
  });

  it("rejects non-ZAPI and unknown ZAPI event types", () => {
    expect(readZapiWebhookType("other.received")).toBeNull();
    expect(readZapiWebhookType("crm.whatsapp.zapi.unknown")).toBeNull();
  });
});

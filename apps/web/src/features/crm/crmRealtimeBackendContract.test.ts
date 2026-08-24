import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeCrmEvents } from "./crmRealtimeApi";
import type { CrmRealtimeEvent } from "./crmConversationTypes";

class BackendEventSource {
  static instances: BackendEventSource[] = [];

  private readonly listeners = new Map<string, EventListener[]>();

  constructor(readonly url: string) {
    BackendEventSource.instances.push(this);
  }

  onerror: ((event: Event) => void) | null = null;

  close = vi.fn();

  addEventListener(type: string, listener: EventListener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  emit(data: unknown, type: string) {
    const event = {
      data: JSON.stringify(data),
      lastEventId: "backend-event-1",
      type,
    } as MessageEvent;
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

describe("CRM realtime backend wire contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    BackendEventSource.instances = [];
  });

  it("accepts the complete API realtime message DTO emitted by the SSE route", async () => {
    vi.stubGlobal("EventSource", BackendEventSource);
    const onEvent = vi.fn<(event: CrmRealtimeEvent) => void>();
    const onError = vi.fn();

    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/api/v1/crm/events",
      eventsTicketRoute: "/api/v1/crm/events/ticket",
      onError,
      onEvent,
      postJson: vi
        .fn()
        .mockResolvedValue({ expiresAt: "2030-01-01", ticket: "ticket-1" }),
    });
    await flushPromises();

    BackendEventSource.instances[0]!.emit(
      {
        connectionId: "connection-1",
        conversationCycle: backendCycleDto(),
        message: backendMessageDto(),
        type: "message",
      },
      "message",
    );

    expect(onError).not.toHaveBeenCalled();
    expect(onEvent).toHaveBeenCalledOnce();
    const [event] = onEvent.mock.calls[0] ?? [];
    expect(event).toMatchObject({
      cycle: {
        customerDisplayName: "Ana",
        profilePhotoUrl: "https://cdn.local/ana.jpg",
      },
      message: {
        externalId: "zapi-message-1",
        providerTimestamp: "2026-08-20T12:00:00.000Z",
      },
      type: "message",
    });

    unsubscribe();
  });
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function backendCycleDto() {
  return {
    assignedMember: null,
    assignedUserId: null,
    channel: "whatsapp",
    connection: null,
    customerDisplayName: "Ana",
    customerPhone: "5511999999999",
    humanAttendanceChangedAt: null,
    humanAttendanceState: "WAITING_HUMAN",
    humanAttendanceStateVersion: 3,
    humanHandlingStartedAt: null,
    id: "cycle-1",
    interventionHistoryStartedAt: null,
    interventionId: null,
    lastCustomerReadAt: null,
    lastMessageAt: "2026-08-20T12:00:00.000Z",
    lastMessageContent: "Olá",
    lastReadAt: null,
    leadId: "lead-1",
    metadata: { source: "zapi" },
    profilePhotoUrl: "https://cdn.local/ana.jpg",
    revision: 7,
    status: "HUMAN_TAKEOVER",
    tags: [
      {
        color: "slate",
        emoji: "⭐",
        id: "tag-1",
        name: "VIP",
        sortOrder: 0,
      },
    ],
    unreadCount: 1,
  };
}

function backendMessageDto() {
  return {
    channel: "whatsapp",
    content: "Olá",
    createdAt: "2026-08-20T12:00:00.000Z",
    deletedAt: null,
    direction: "INBOUND",
    externalId: "zapi-message-1",
    id: "message-1",
    mediaType: null,
    mediaUrl: null,
    metadata: { provider: "zapi" },
    providerTimestamp: "2026-08-20T12:00:00.000Z",
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    type: "TEXT",
  };
}

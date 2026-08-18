import { describe, expect, it, vi } from "vitest";
import type {
  CanonicalInboundMessageInput,
  CrmCanonicalInboundRepository,
} from "../ports/crmCanonicalInboundRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { persistCanonicalInbound } from "./persistCanonicalInbound.js";

describe("persistCanonicalInbound", () => {
  it("normalizes the confirmed identity before canonical persistence", async () => {
    const ingestInboundMessage = vi.fn(
      async (input: CanonicalInboundMessageInput) => ({
        attendanceState: "bot_active" as const,
        contactId: "contact-1",
        created: true,
        createdSession: true,
        cycleId: "cycle-1",
        identityId: "identity-1",
        messageId: input.providerMessageId,
        threadId: "thread-1",
      }),
    );
    const ports = {
      crmCanonicalInboundRepository: {
        ingestInboundMessage,
      } satisfies CrmCanonicalInboundRepository,
    } as unknown as CrmServicePorts;

    await persistCanonicalInbound(ports, {
      channel: "whatsapp",
      connectionId: "connection-1",
      contactDisplayName: "Buyer",
      content: "Olá",
      externalThreadId: "thread-external-1",
      identity: { kind: "phone", normalizedValue: "(11) 99999-9999" },
      occurredAt: new Date("2026-08-12T12:00:00.000Z"),
      messageType: "text",
      metadata: {
        authorization: "must-not-persist",
        provider: "zapi",
        providerUrl: "https://provider.test/signed?token=secret",
      },
      provider: "zapi",
      providerMessageId: "message-1",
      sender: "customer",
      storeId: "store-1",
      tenantId: "tenant-1",
    });

    expect(ingestInboundMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: { kind: "phone", normalizedValue: "+11999999999" },
        externalThreadAliases: [],
        provider: "zapi",
        metadata: { provider: "zapi" },
        secondaryPhone: null,
      }),
    );
  });

  it("supplies legacy raw aliases for a prefixed Z-API thread", async () => {
    const ingestInboundMessage = vi.fn(async () => ({
      attendanceState: "bot_active" as const,
      contactId: "contact-1",
      created: true,
      createdSession: true,
      cycleId: "cycle-1",
      identityId: "identity-1",
      messageId: "message-1",
      threadId: "thread-1",
    }));
    await persistCanonicalInbound(
      {
        crmCanonicalInboundRepository: { ingestInboundMessage },
      } as unknown as CrmServicePorts,
      {
        channel: "whatsapp",
        connectionId: "connection-1",
        contactDisplayName: null,
        content: "Olá",
        externalThreadId: "phone:5511999999999",
        identity: { kind: "phone", normalizedValue: "5511999999999" },
        messageType: "text",
        occurredAt: new Date("2026-08-12T12:00:00.000Z"),
        provider: "zapi",
        providerMessageId: "message-1",
        sender: "customer",
        storeId: "store-1",
        tenantId: "tenant-1",
      },
    );
    expect(ingestInboundMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        externalThreadAliases: ["5511999999999", "+5511999999999"],
      }),
    );
  });

  it("fails closed when the canonical port is absent", () => {
    expect(() =>
      persistCanonicalInbound({} as CrmServicePorts, {
        channel: "olx_chat",
        connectionId: "connection-1",
        contactDisplayName: null,
        content: "Tenho interesse",
        externalThreadId: "chat-1",
        identity: {
          kind: "provider_subject",
          normalizedValue: "olx:connection-1:chat-1",
        },
        occurredAt: new Date("2026-08-12T12:00:00.000Z"),
        messageType: "text",
        provider: "olx",
        providerMessageId: "message-1",
        sender: "customer",
        storeId: "store-1",
        tenantId: "tenant-1",
      }),
    ).toThrow("Canonical CRM inbound repository is unavailable.");
  });
});

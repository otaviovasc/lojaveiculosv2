import { describe, expect, it } from "vitest";
import type { CanonicalInboundMessageInput } from "../../../../domains/crm/ports/crmCanonicalInboundRepository.js";
import { createMemoryCrmCanonicalInboundRepository } from "./crmCanonicalInboundRepository.js";

describe("memory canonical CRM inbound repository", () => {
  it("scopes provider idempotency by tenant, store, and connection", async () => {
    const repository = createMemoryCrmCanonicalInboundRepository();
    const first = await repository.ingestInboundMessage(input());
    const duplicate = await repository.ingestInboundMessage(input());
    const otherConnection = await repository.ingestInboundMessage(
      input({ connectionId: "connection-2" }),
    );
    const otherTenant = await repository.ingestInboundMessage(
      input({ tenantId: "tenant-2" }),
    );

    expect(first.created).toBe(true);
    expect(duplicate).toMatchObject({
      created: false,
      messageId: first.messageId,
    });
    expect(otherConnection).toMatchObject({ created: true });
    expect(otherTenant).toMatchObject({ created: true });
    expect(repository.snapshot()).toMatchObject({
      attendances: [
        { state: "bot_active" },
        { state: "bot_active" },
        { state: "bot_active" },
      ],
      cycles: [{ state: "active" }, { state: "active" }, { state: "active" }],
    });
    expect(repository.snapshot().messages).toHaveLength(3);
    expect(repository.snapshot().threads).toHaveLength(3);
  });
});

function input(
  overrides: Partial<CanonicalInboundMessageInput> = {},
): CanonicalInboundMessageInput {
  return {
    channel: "whatsapp",
    connectionId: "connection-1",
    contactDisplayName: "Cliente",
    content: "Olá",
    customerChatId: null,
    externalThreadAliases: [],
    externalThreadId: "phone:5511999999999",
    identity: { kind: "phone", normalizedValue: "+5511999999999" },
    leadId: "lead-1",
    mediaType: null,
    mediaUrl: null,
    messageType: "text",
    metadata: {},
    occurredAt: new Date("2026-08-18T12:00:00.000Z"),
    provider: "zapi",
    providerMessageId: "provider-message-1",
    profilePhotoStorageKey: null,
    profilePhotoUrl: null,
    secondaryPhone: null,
    sender: "customer",
    senderOrigin: "customer",
    cycleMetadata: {},
    source: "whatsapp",
    storeId: "store-1",
    tenantId: "tenant-1",
    ...overrides,
  };
}

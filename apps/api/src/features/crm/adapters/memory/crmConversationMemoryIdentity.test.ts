import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { IngestCrmMessageInput } from "../../../../domains/crm/ports/crmConversationRepository.js";
import { createMemoryCrmConversationRepository } from "./crmConversationRepository.js";

describe("memory conversation identity matching", () => {
  it("merges a manual outbound echo into an inbound thread across phone formats", async () => {
    // Production regression: inbound uazapi messages key the thread with the
    // LID chat id and a "+55..." phone, while fromMe echoes typed on the
    // phone carry the bare digits without chat id. They must resolve to the
    // same conversation instead of duplicating it.
    const repository = createMemoryCrmConversationRepository();
    const inbound = await repository.ingestMessage(
      input({
        customerChatId: "108765936390248",
        customerPhone: "+5511985492129",
        direction: "INBOUND",
        externalId: "inbound-1",
        externalThreadId: "phone:+5511985492129",
        senderOrigin: "customer",
        senderType: "CUSTOMER",
      }),
    );
    const echo = await repository.ingestMessage(
      input({
        customerPhone: "5511985492129",
        direction: "OUTBOUND",
        externalId: "echo-1",
        senderOrigin: "human_channel",
        senderType: "HUMAN",
      }),
    );

    expect(inbound.createdConversationCycle).toBe(true);
    expect(echo.createdConversationCycle).toBe(false);
    expect(echo.conversationCycle.id).toBe(inbound.conversationCycle.id);
  });

  it("merges threads across the Brazilian ninth-digit variants", async () => {
    const repository = createMemoryCrmConversationRepository();
    const withNine = await repository.ingestMessage(
      input({ customerPhone: "5511985492129", externalId: "nine-1" }),
    );
    const withoutNine = await repository.ingestMessage(
      input({ customerPhone: "+551185492129", externalId: "nine-2" }),
    );

    expect(withoutNine.createdConversationCycle).toBe(false);
    expect(withoutNine.conversationCycle.id).toBe(
      withNine.conversationCycle.id,
    );
  });
});

function input(
  overrides: Partial<IngestCrmMessageInput> = {},
): IngestCrmMessageInput {
  return {
    channel: "WHATSAPP",
    connectionId: "connection-1",
    content: "Olá",
    direction: "INBOUND",
    externalId: "external-1",
    metadata: {},
    providerTimestamp: new Date("2026-09-09T12:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId: "store-1" as StoreId,
    tenantId: "tenant-1" as TenantId,
    type: "TEXT",
    customerPhone: "5511985492129",
    ...overrides,
  };
}

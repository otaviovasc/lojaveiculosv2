import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmLead, CrmRepository } from "../ports/crmRepository.js";
import type { CrmWhatsappRepository } from "../ports/crmWhatsappRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { createTestCrmWhatsappSession } from "../testSupportWhatsapp.js";
import type { ParsedOlxChatWebhook } from "./parseOlxChatWebhook.js";
import { persistOlxChatWebhook } from "./persistOlxChatWebhook.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;

describe("persistOlxChatWebhook", () => {
  it("refuses to persist seller echoes as inbound customer messages", () => {
    expect(() =>
      persistOlxChatWebhook({} as CrmServicePorts, {
        connection: connection(),
        parsed: parsed({ origin: "seller", senderType: "account" }),
        providerEventId: "event-1",
      }),
    ).toThrow("Only buyer-origin OLX Chat messages can be persisted.");
  });

  it("keeps system sender semantics while buyer origin controls direction", async () => {
    const stopAfterCapture = new Error("stop after capture");
    const ingestMessage = vi.fn(async () => {
      throw stopAfterCapture;
    });
    const lead = createLead();
    const session = createTestCrmWhatsappSession({
      channel: "OLX_CHAT",
      connectionId: "connection-1",
      leadId: lead.id,
      storeId,
      tenantId,
    });
    const ports = {
      crmRepository: {
        findLeadById: vi.fn(async () => lead),
      } as unknown as CrmRepository,
      crmWhatsappRepository: {
        ingestMessage,
        upsertSessionContext: vi.fn(async () => session),
      } as unknown as CrmWhatsappRepository,
    } satisfies CrmServicePorts;

    await expect(
      persistOlxChatWebhook(ports, {
        connection: connection(),
        parsed: parsed({ origin: "buyer", senderType: "system" }),
        providerEventId: "event-1",
      }),
    ).rejects.toBe(stopAfterCapture);
    expect(ingestMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "INBOUND",
        senderOrigin: "system",
        senderType: "SYSTEM",
      }),
    );
  });
});

function parsed(
  direction:
    | { origin: "buyer"; senderType: "account" | "buyer" | "system" }
    | { origin: "seller"; senderType: "account" | "system" },
): ParsedOlxChatWebhook {
  return {
    buyerEmail: null,
    buyerName: null,
    buyerPhone: "5511999999999",
    chatId: "chat-1",
    externalMessageId: "message-1",
    listId: "listing-1",
    message: "Tenho interesse",
    timestamp: new Date("2026-08-10T12:00:00.000Z"),
    ...direction,
  };
}

function connection(): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "OLX",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "olx_chat",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

function createLead(): CrmLead {
  const now = new Date("2026-08-10T12:00:00.000Z");
  return {
    assignedUserId: null,
    buyerEmail: null,
    buyerName: null,
    buyerPhone: "5511999999999",
    createdAt: now,
    id: "lead-1",
    lastInteractionAt: now,
    listingId: null,
    metadata: { crmWhatsapp: { firstMessageExternalId: "message-0" } },
    pipelineId: null,
    pipelineStageId: null,
    source: "olx",
    status: "new",
    storeId,
    tenantId,
    updatedAt: now,
    vehicleTitle: null,
  };
}

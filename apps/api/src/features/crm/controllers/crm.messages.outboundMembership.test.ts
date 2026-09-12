import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createMemoryCrmConnectionMemberRepository } from "../adapters/memory/crmConnectionMemberRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { resolveCrmConnectionScopedQueueVisibility } from "../../../domains/crm/messaging/crmQueueVisibility.js";
import { createServiceContext } from "../../../shared/serviceContext.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";
const sellerUserId = "02020202-0202-4202-8202-020202020202";

describe("CRM outbound connection membership enforcement", () => {
  it("blocks outbound sending and prevents provider effect when membership is revoked", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const connectionMemberRepository =
      createMemoryCrmConnectionMemberRepository();

    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Cliente Teste",
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-msg-1",
      metadata: {},
      providerTimestamp: new Date(),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });

    // Initially grant the seller as the only member on the connection
    await connectionMemberRepository.grantMember({
      connectionId,
      grantedBy: null,
      storeId,
      tenantId,
      userId: sellerUserId as never,
    });

    // Assign seller to the cycle, but then revoke the ONLY member on the connection
    await conversationRepository.updateConversationCycle({
      assignedUserId: sellerUserId as never,
      cycleId: inbound.conversationCycle.id,
      storeId,
      tenantId,
    });

    const revokeResult = await connectionMemberRepository.revokeMember({
      connectionId,
      storeId,
      tenantId,
      userId: sellerUserId as never,
    });
    expect(revokeResult.revoked).toBe(true);

    const sendText = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConfiguredZapiTestConnection({
          id: connectionId,
          storeId,
          tenantId,
        }),
      ]),
      crmConnectionMemberRepository: connectionMemberRepository,
      crmMessagingGateway: { sendText },
      crmConversationRepository: conversationRepository,
      permissions: ["crm.conversations.read", "crm.messages.send"], // seller without crm.conversations.assign
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
      {
        body: JSON.stringify({ content: "Mensagem proibida" }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "idemp-blocked-1",
        },
        method: "POST",
      },
    );

    expect(response.status).toBe(404);
    expect(sendText).not.toHaveBeenCalled();

    // Verify queue visibility in memory matches Drizzle (revoked user sees no cycles for that connection)
    const sellerContext = createServiceContext({
      actor: { id: sellerUserId, kind: "user" },
      permissions: ["crm.conversations.read"],
      request: { requestId: "req_vis" },
      storeId,
      tenantId,
    });
    const visibility = await resolveCrmConnectionScopedQueueVisibility(
      sellerContext,
      { crmConnectionMemberRepository: connectionMemberRepository },
    );
    const visibleCycles = await conversationRepository.listConversationCycles({
      limit: 10,
      offset: 0,
      queueVisibility: visibility,
      storeId,
      tenantId,
    });
    expect(visibleCycles).toHaveLength(0);
  });

  it("allows outbound sending and self-assignment when seller has connection membership", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const connectionMemberRepository =
      createMemoryCrmConnectionMemberRepository();

    await connectionMemberRepository.grantMember({
      connectionId,
      grantedBy: null,
      storeId,
      tenantId,
      userId: sellerUserId as never,
    });

    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Cliente Teste",
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-msg-2",
      metadata: {},
      providerTimestamp: new Date(),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });

    const sendText = vi.fn(async () => ({
      externalId: "zapi-reply-2",
      providerTimestamp: new Date(),
      raw: {},
    }));

    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConfiguredZapiTestConnection({
          id: connectionId,
          storeId,
          tenantId,
        }),
      ]),
      crmConnectionMemberRepository: connectionMemberRepository,
      crmMessagingGateway: { sendText },
      crmConversationRepository: conversationRepository,
      permissions: ["crm.conversations.read", "crm.messages.send"],
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
      {
        body: JSON.stringify({ content: "Resposta autorizada" }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "idemp-allowed-1",
        },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(sendText).toHaveBeenCalledTimes(1);

    // Verify self-assignment occurred
    const [updatedCycle] = await conversationRepository.listConversationCycles({
      cycleId: inbound.conversationCycle.id,
      limit: 1,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(updatedCycle?.assignedUserId).toBe(sellerUserId);
  });
});

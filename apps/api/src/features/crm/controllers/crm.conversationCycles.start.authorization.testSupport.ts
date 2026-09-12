import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConversationRepository } from "../../../domains/crm/ports/crmConversationRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import type { createTestApp } from "./crm.controller.testSupport.js";
import { requestStartConversation } from "./crm.startConversation.testSupport.js";

export const startActorUserId = "02020202-0202-4202-8202-020202020202";
export const startOtherUserId = "03030303-0303-4303-8303-030303030303";
export const startStoreId = "store_1" as StoreId;
export const startTenantId = "tenant_1" as TenantId;
export const restrictedStartPermissions = [
  "crm.messages.send",
] satisfies PermissionKey[];
const connectionId = "24000000-0000-4000-8000-000000000101";
const phone = "5511999999988";

export function startConversationConnections() {
  return createMemoryCrmConnectionRepository([
    createConfiguredZapiTestConnection({
      id: connectionId,
      storeId: startStoreId,
      tenantId: startTenantId,
    }),
  ]);
}

export async function seedStartConversationCycle(
  repository: CrmConversationRepository,
  assignedUserId: string | null,
) {
  const seeded = await repository.ingestMessage({
    customerPhone: phone,
    channel: "WHATSAPP",
    connectionId,
    content: "Inbound",
    direction: "INBOUND",
    externalId: `inbound-${assignedUserId ?? "unassigned"}`,
    metadata: {},
    providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId: startStoreId,
    tenantId: startTenantId,
    type: "TEXT",
  });
  if (assignedUserId) {
    await repository.updateConversationCycle({
      assignedUserId: assignedUserId as never,
      cycleId: seeded.conversationCycle.id,
      storeId: startStoreId,
      tenantId: startTenantId,
    });
  }
  return seeded;
}

export function findStartConversationCycle(
  repository: CrmConversationRepository,
  cycleId: string,
) {
  return repository
    .listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId,
      storeId: startStoreId,
      tenantId: startTenantId,
    })
    .then(([cycle]) => cycle);
}

export function listStartConversationMessages(
  repository: CrmConversationRepository,
  cycleId: string,
) {
  return repository.listMessages({
    limit: 10,
    offset: 0,
    cycleId,
    storeId: startStoreId,
    tenantId: startTenantId,
  });
}

export function startConversationProviderResult(externalId: string) {
  return {
    externalId,
    providerTimestamp: new Date("2026-08-18T12:01:00.000Z"),
    raw: {},
  };
}

export function requestAuthorizedStartConversation(
  app: ReturnType<typeof createTestApp>,
) {
  return requestStartConversation(app, {
    channel: "whatsapp",
    recipientAddress: phone,
    text: "Outbound",
  });
}

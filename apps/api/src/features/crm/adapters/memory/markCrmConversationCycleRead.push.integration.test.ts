import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmConversationRepository,
  UpdateCrmConversationCycleInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import { markConversationCycleReadState } from "../../../../domains/crm/services/CrmMessagingService/markCrmConversationCycleRead.js";
import { createTestCrmConversationCycle } from "../../../../domains/crm/testSupportWhatsapp.js";
import { createMemoryCrmConnectionRepository } from "./crmConnectionRepository.js";
import { createMemoryCrmConversationCycleCommandRepository } from "./crmConversationCycleCommandRepository.js";
import { createMemoryCrmRepository } from "./crmRepository.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;

describe("markConversationCycleReadState push generation", () => {
  it("invalidates the current push generation on real read and unread transitions", async () => {
    let cycle = createTestCrmConversationCycle({
      connectionId: "connection-1",
      id: "cycle-1",
      lastReadAt: null,
      messageCount: 2,
      storeId,
      tenantId,
      unreadCount: 2,
    });
    const updates: UpdateCrmConversationCycleInput[] = [];
    const updateConversationCycle = vi.fn(
      async (input: UpdateCrmConversationCycleInput) => {
        updates.push(input);
        cycle = {
          ...cycle,
          lastReadAt: input.lastReadAt ?? null,
          revision: cycle.revision + 1,
        };
        return cycle;
      },
    );
    const crmConversationRepository = {
      listConversationCycles: async () => [cycle],
      updateConversationCycle,
    } as unknown as CrmConversationRepository;
    const ports = {
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        connection(),
      ]),
      crmConversationCycleCommandRepository:
        createMemoryCrmConversationCycleCommandRepository(),
      crmConversationRepository,
      crmRepository: createMemoryCrmRepository(),
    };

    await expect(
      markConversationCycleReadState(
        context(),
        { commandId: "read-1", cycleId: cycle.id, unread: false },
        ports,
      ),
    ).resolves.toMatchObject({ result: "applied" });
    await expect(
      markConversationCycleReadState(
        context(),
        { commandId: "unread-1", cycleId: cycle.id, unread: true },
        ports,
      ),
    ).resolves.toMatchObject({ result: "applied" });

    expect(updates).toHaveLength(2);
    expect(updates[0]?.incrementPushNotificationGeneration).toBe(true);
    expect(updates[0]?.lastReadAt).toBeInstanceOf(Date);
    expect(updates[1]).toMatchObject({
      incrementPushNotificationGeneration: true,
      lastReadAt: null,
    });
  });

  it("does not invalidate the generation for an already-applied transition", async () => {
    const cycle = createTestCrmConversationCycle({
      connectionId: "connection-1",
      id: "cycle-1",
      lastReadAt: new Date("2026-08-24T12:00:00.000Z"),
      storeId,
      tenantId,
      unreadCount: 0,
    });
    const updateConversationCycle = vi.fn();
    const ports = {
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        connection(),
      ]),
      crmConversationCycleCommandRepository:
        createMemoryCrmConversationCycleCommandRepository(),
      crmConversationRepository: {
        listConversationCycles: async () => [cycle],
        updateConversationCycle,
      } as unknown as CrmConversationRepository,
      crmRepository: createMemoryCrmRepository(),
    };

    await expect(
      markConversationCycleReadState(
        context(),
        { commandId: "read-1", cycleId: cycle.id, unread: false },
        ports,
      ),
    ).resolves.toMatchObject({ result: "already_applied" });
    expect(updateConversationCycle).not.toHaveBeenCalled();
  });
});

function context() {
  return createServiceContext({
    actor: { id: "user-1", kind: "user" },
    entitlements: ["crm"],
    permissions: ["crm.conversations.read"],
    request: { requestId: crypto.randomUUID() },
    source: { component: "test", service: "api" },
    storeId,
    tenantId,
  });
}

function connection() {
  return {
    broker: "direct" as const,
    channel: "whatsapp" as const,
    credentialsRef: {},
    displayName: "WhatsApp",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "zapi" as const,
    revision: 0,
    status: "active" as const,
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

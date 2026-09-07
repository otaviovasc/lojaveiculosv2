import { describe, expect, it, vi } from "vitest";
import { evaluateStoreSpecialDates } from "./evaluateStoreSpecialDates.js";
import { createMemoryCrmSpecialDateRepository } from "../../testSupportSpecialDates.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../CrmService/types.js";
import type { CrmConnectionRepository } from "../../ports/crmConnectionRepository.js";

function createContext(): ServiceContext {
  return {
    actor: { id: "user-1", kind: "user" },
    audit: { record: vi.fn() },
    entitlements: ["crm"],
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } as never,
    permissions: ["crm.scheduled_messages.process"],
    platformAdmin: false,
    requestId: "req-1",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
  };
}

const connectionRepo = {
  findConnectionById: vi.fn().mockResolvedValue({
    channel: "whatsapp",
    id: "conn-1",
    provider: "zapi",
    status: "active",
    storeId: "store-1",
    tenantId: "tenant-1",
  }),
} as unknown as CrmConnectionRepository;

describe("evaluateStoreSpecialDates routing guard", () => {
  it("skips an enabled config when the store route cannot schedule it", async () => {
    const specialDateRepo = createMemoryCrmSpecialDateRepository({
      birthdayRecipients: [
        {
          key: "lead:lead-1",
          name: "Lucas Mendes",
          phone: "5511999991111",
          rawDate: "1995-09-07",
          storeId: "store-1" as never,
          tenantId: "tenant-1" as never,
        },
      ],
      configs: [
        {
          connectionId: "conn-1",
          createdAt: new Date(),
          dateType: "birthday",
          enabled: true,
          id: "cfg-1",
          leadDays: 0,
          messageTemplate: "Parabéns, {nome}!",
          sendTime: "09:00",
          storeId: "store-1" as never,
          tenantId: "tenant-1" as never,
          updatedAt: new Date(),
        },
      ],
    });
    const context = createContext();
    const result = await evaluateStoreSpecialDates(
      context,
      {
        crmConnectionRepository: connectionRepo,
        crmRoutingConnectionRepository: {
          listConnections: async () => [],
        },
        crmRoutingPolicyRepository: {
          createDefaultIfMissing: async () => null,
          listPolicies: async () => [],
          upsertPolicy: async (input: Record<string, unknown>) => ({
            ...input,
            id: "policy-1",
          }),
        },
        crmSpecialDateRepository: specialDateRepo,
      } as unknown as CrmServicePorts,
      new Date("2026-09-07T13:00:00.000Z"),
    );

    expect(result.scheduledMessages).toBe(0);
    expect(context.logger.info).toHaveBeenCalledWith(
      "crm.special_date.config.skipped",
      expect.objectContaining({ reason: "CrmRoutingPolicyValidationError" }),
    );
  });
});

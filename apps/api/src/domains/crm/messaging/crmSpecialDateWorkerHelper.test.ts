import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { createMemoryCrmSpecialDateRepository } from "../testSupportSpecialDates.js";
import { listConfiguredSpecialDateScopes } from "./crmSpecialDateWorkerHelper.js";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

describe("crm special-date worker discovery", () => {
  it("walks every config-only scope across paginated repository pages", async () => {
    const repository = createMemoryCrmSpecialDateRepository({
      configs: Array.from({ length: 101 }, (_, index) => ({
        connectionId: `connection-${index}`,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        dateType: "birthday" as const,
        enabled: true,
        id: `config-${index}`,
        leadDays: 0,
        messageTemplate: "Olá, {nome}!",
        sendTime: "09:00",
        storeId: `store-${index}` as StoreId,
        tenantId: "tenant-1" as TenantId,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      })),
    });
    const pageCalls: Array<{ cursor?: string; limit: number }> = [];
    const listEnabledConfigScopes = vi.fn(
      (input: { cursor?: string; limit: number }) => {
        pageCalls.push(input);
        return repository.listEnabledConfigScopes(input);
      },
    );
    const context = createServiceContext({
      actor: { id: "crm_schedule_worker", kind: "system" },
      entitlements: ["crm"],
      permissions: ["crm.scheduled_messages.process"],
      request: { requestId: "special-date-discovery-test" },
    });

    const scopes = await listConfiguredSpecialDateScopes(
      context,
      {
        crmSpecialDateRepository: {
          ...repository,
          listEnabledConfigScopes,
        },
      } as unknown as CrmServicePorts,
      100,
    );

    expect(scopes).toHaveLength(101);
    expect(pageCalls).toEqual([{ limit: 100 }, { cursor: "100", limit: 100 }]);
  });
});

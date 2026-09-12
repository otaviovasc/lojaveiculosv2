import { describe, expect, it, vi } from "vitest";
import { emptyCrmStatisticsSnapshot } from "../../../domains/crm/readModels/crmStatisticsReadModel.js";
import { createTestApp } from "./crm.controller.testSupport.js";

describe("GET /crm/statistics", () => {
  it("scopes the requested period and connection through the statistics read model", async () => {
    const load = vi.fn(async () => ({
      ...emptyCrmStatisticsSnapshot(),
      messages: {
        externalAiOutbound: 1,
        humanOutbound: 3,
        inbound: 5,
        internalAutomationOutbound: 1,
        otherOutbound: 0,
        total: 10,
      },
      summary: {
        ...emptyCrmStatisticsSnapshot().summary,
        conversationsCreated: 4,
      },
    }));
    const app = createTestApp({ crmStatisticsReadModel: { load } });
    const response = await app.request(
      "/api/v1/crm/statistics?from=2026-08-01T03%3A00%3A00.000Z&toExclusive=2026-08-08T03%3A00%3A00.000Z&connectionId=11111111-1111-4111-8111-111111111111",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      messages: {
        externalAiOutbound: 1,
        internalAutomationOutbound: 1,
        otherOutbound: 0,
        total: 10,
      },
      period: { timezone: "America/Sao_Paulo" },
      summary: { conversationsCreated: 4 },
    });
    expect(load).toHaveBeenCalledWith({
      connectionId: "11111111-1111-4111-8111-111111111111",
      from: new Date("2026-08-01T03:00:00.000Z"),
      storeId: "store_1",
      tenantId: "tenant_1",
      toExclusive: new Date("2026-08-08T03:00:00.000Z"),
    });
  });

  it("rejects invalid ranges and missing permission", async () => {
    const invalid = await createTestApp().request(
      "/api/v1/crm/statistics?from=2026-08-09T00%3A00%3A00.000Z&toExclusive=2026-08-01T00%3A00%3A00.000Z",
    );
    const forbidden = await createTestApp({ permissions: [] }).request(
      "/api/v1/crm/statistics?from=2026-08-01T00%3A00%3A00.000Z&toExclusive=2026-08-09T00%3A00%3A00.000Z",
    );
    expect(invalid.status).toBe(400);
    expect(forbidden.status).toBe(403);
  });

  it.each([
    {
      from: "2026-08-01T03:00:00.000Z",
      toExclusive: "2026-08-08T03:00:00.000Z",
    },
    {
      from: "2026-08-01T00:00:00.000-03:00",
      toExclusive: "2026-08-08T00:00:00.000-03:00",
    },
  ])("accepts RFC 3339 statistics timestamps: $from", async (period) => {
    const load = vi.fn(async () => emptyCrmStatisticsSnapshot());
    const app = createTestApp({ crmStatisticsReadModel: { load } });
    const params = new URLSearchParams(period);

    const response = await app.request(`/api/v1/crm/statistics?${params}`);

    expect(response.status).toBe(200);
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date(period.from),
        toExclusive: new Date(period.toExclusive),
      }),
    );
  });
});

import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createCrmRealtimeBroker } from "./crmRealtimeBroker.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;

describe("createCrmRealtimeBroker", () => {
  it("consumes a realtime ticket atomically", async () => {
    const broker = createCrmRealtimeBroker();
    const issued = await broker.issueTicket({ storeId, tenantId });

    const resolutions = await Promise.all([
      broker.resolveTicket(issued.ticket),
      broker.resolveTicket(issued.ticket),
    ]);

    expect(resolutions.filter(Boolean)).toHaveLength(1);
    expect(resolutions.filter((scope) => scope === null)).toHaveLength(1);
  });
});

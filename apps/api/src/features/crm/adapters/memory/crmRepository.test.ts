import { describe, expect, it } from "vitest";
import { createMemoryCrmRepository } from "./crmRepository.js";

const scope = {
  storeId: "store_1" as never,
  tenantId: "tenant_1" as never,
};

describe("createMemoryCrmRepository", () => {
  it("filters leads by V2 source and listing", async () => {
    const repository = createMemoryCrmRepository();
    const listingId = "11111111-1111-4111-8111-111111111111";
    const matchedLead = await repository.createLead({
      ...scope,
      buyerName: "Lead vinculado",
      listingId,
      source: "olx",
    });
    await repository.createLead({
      ...scope,
      buyerName: "Lead manual",
      source: "manual",
    });

    await expect(
      repository.listLeads({
        ...scope,
        limit: 100,
        listingId,
        source: "olx",
      }),
    ).resolves.toEqual([matchedLead]);
  });
});

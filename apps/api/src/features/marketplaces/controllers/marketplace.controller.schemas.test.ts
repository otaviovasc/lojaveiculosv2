import { describe, expect, it } from "vitest";
import {
  createMarketplaceSyncJobSchema,
  upsertMarketplaceAccountSchema,
} from "./marketplace.controller.schemas.js";

describe("marketplace write schemas", () => {
  it("rejects client-owned OAuth configuration", () => {
    expect(
      upsertMarketplaceAccountSchema.safeParse({
        config: { credentials: { accessToken: "attacker-token" } },
        provider: "olx",
        status: "active",
      }).success,
    ).toBe(false);
  });

  it("requires an idempotency command id for direct listing jobs", () => {
    expect(
      createMarketplaceSyncJobSchema.safeParse({
        jobType: "listing_publish",
        metadata: { listingId: "listing_1" },
        provider: "olx",
      }).success,
    ).toBe(false);
    expect(
      createMarketplaceSyncJobSchema.safeParse({
        jobType: "listing_publish",
        metadata: {
          commandId: "11111111-1111-4111-8111-111111111111",
          listingId: "listing_1",
        },
        provider: "olx",
      }).success,
    ).toBe(true);
  });

  it.each([
    ["externalId", "another-account-ad"],
    ["providerRequest", {}],
    ["providerResult", {}],
  ])("rejects the server-owned job field %s", (field, value) => {
    expect(
      createMarketplaceSyncJobSchema.safeParse({
        jobType: "listing_update",
        metadata: { [field]: value, listingId: "listing_1" },
        provider: "olx",
      }).success,
    ).toBe(false);
  });
});

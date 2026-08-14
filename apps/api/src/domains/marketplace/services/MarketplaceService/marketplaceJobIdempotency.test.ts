import { describe, expect, it } from "vitest";
import { marketplaceJobIdempotencyKey } from "./marketplaceJobIdempotency.js";

describe("marketplaceJobIdempotencyKey", () => {
  it("deduplicates a direct command by its explicit command id", () => {
    const input = {
      jobType: "listing_publish" as const,
      metadata: {
        commandId: "11111111-1111-4111-8111-111111111111",
        listingId: "listing_1",
      },
      provider: "olx" as const,
    };

    expect(marketplaceJobIdempotencyKey(input)).toBe(
      marketplaceJobIdempotencyKey(input),
    );
  });

  it("deduplicates repeated retries even when the original had no batch", () => {
    const input = {
      jobType: "listing_update" as const,
      metadata: { listingId: "listing_1", retryOfJobId: "failed_job_1" },
      provider: "olx" as const,
    };

    expect(marketplaceJobIdempotencyKey(input)).toMatch(/^[a-f0-9]{64}$/);
    expect(marketplaceJobIdempotencyKey(input)).toBe(
      marketplaceJobIdempotencyKey(input),
    );
  });
});

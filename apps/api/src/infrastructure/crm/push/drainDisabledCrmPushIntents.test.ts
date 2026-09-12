import { describe, expect, it, vi } from "vitest";
import type { CrmPushRepository } from "../../../domains/crm/ports/crmPushRepository.js";
import { drainDisabledCrmPushIntents } from "./drainDisabledCrmPushIntents.js";

describe("disabled CRM push drain", () => {
  it("leases and releases pending intents without a delivery provider", async () => {
    const releaseGeneration = vi.fn().mockResolvedValue("applied");
    const repository = {
      claimDeliveryBatch: vi
        .fn()
        .mockResolvedValue([{ id: "intent", leaseToken: "lease" }]),
      releaseGeneration,
    } as unknown as CrmPushRepository;
    await expect(
      drainDisabledCrmPushIntents({
        batchSize: 25,
        leaseDurationMs: 60_000,
        now: new Date("2026-01-01T00:00:00Z"),
        repository,
      }),
    ).resolves.toEqual({ claimed: 1, released: 1, staleLease: 0 });
    expect(releaseGeneration).toHaveBeenCalledWith({
      intentId: "intent",
      leaseToken: "lease",
      reason: "delivery_disabled",
      releasedAt: new Date("2026-01-01T00:00:00Z"),
    });
  });
});

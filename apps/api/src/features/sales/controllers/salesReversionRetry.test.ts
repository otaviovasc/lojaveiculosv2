import { describe, expect, it } from "vitest";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import { closeSale } from "./salesReversion.testSupport.js";
import {
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

describe("sale reversion retries", () => {
  it("retries idempotently after a post-compensation revision conflict", async () => {
    const inner = createMemorySalesRepository();
    let failOnce = true;
    const repository = {
      ...inner,
      async createCorrectionRevision(
        ...args: Parameters<typeof inner.createCorrectionRevision>
      ) {
        if (failOnce) {
          failOnce = false;
          return null;
        }
        return inner.createCorrectionRevision(...args);
      },
    };
    const { services, vehiclePorts } = createHarness("reserved", repository);
    const original = await closeSale(services);

    await expect(
      services.revert(context(["sale.correct"]), {
        reason: "Retryable correction",
        saleId: original.id,
      }),
    ).rejects.toThrow("Sale revision changed");
    const statusArtifacts = vehiclePorts.operationsRepository.statuses.length;
    const documentArtifacts = vehiclePorts.documents.size;
    const financeArtifacts = vehiclePorts.financeRepository.entries.length;

    const correction = await services.revert(context(["sale.correct"]), {
      reason: "Retryable correction",
      saleId: original.id,
    });

    expect(correction.revision).toBe(2);
    expect(vehiclePorts.operationsRepository.statuses).toHaveLength(
      statusArtifacts,
    );
    expect(vehiclePorts.documents.size).toBe(documentArtifacts);
    expect(vehiclePorts.financeRepository.entries).toHaveLength(
      financeArtifacts,
    );
  });

  it("resumes a partially compensated vehicle without duplicating unit history", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const original = await closeSale(services);
    const saveListing = vehiclePorts.listingRepository.save;
    let failOnce = true;
    vehiclePorts.listingRepository.save = async (listing) => {
      if (failOnce && listing.status === "published") {
        failOnce = false;
        throw new Error("simulated listing compensation failure");
      }
      return saveListing(listing);
    };

    await expect(
      services.revert(context(["sale.correct"]), {
        reason: "Partial compensation retry",
        saleId: original.id,
      }),
    ).rejects.toThrow("simulated listing compensation failure");
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("available");
    expect(vehiclePorts.listings.get("listing_1")?.status).toBe("sold_out");

    const correction = await services.revert(context(["sale.correct"]), {
      reason: "Partial compensation retry",
      saleId: original.id,
    });

    expect(correction.revision).toBe(2);
    expect(vehiclePorts.listings.get("listing_1")?.status).toBe("published");
    expect(
      vehiclePorts.operationsRepository.statuses.filter(
        (entry) => entry.toStatus === "available",
      ),
    ).toHaveLength(1);
  });
});

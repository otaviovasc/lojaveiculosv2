import { describe, expect, it } from "vitest";
import {
  cleanCreateSaleDraftInput,
  cleanUpdateSaleDraftInput,
} from "./sales.controller.cleaners.js";
import { saleDraftSchema } from "./sales.controller.schemas.js";

describe("sales controller cleaners", () => {
  it("keeps persisted payment ids only on draft updates", () => {
    const id = crypto.randomUUID();
    const parsed = saleDraftSchema.parse({
      payments: [{ amountCents: 100000, id, method: "pix" }],
    });

    expect(cleanUpdateSaleDraftInput(parsed).payments?.[0]?.id).toBe(id);
    expect(cleanCreateSaleDraftInput(parsed).payments?.[0]?.id).toBeUndefined();
  });

  it("validates known sale source facts while preserving extension keys", () => {
    const parsed = saleDraftSchema.parse({
      saleSourceSnapshot: {
        documentation: {
          chargedAmountCents: 75_000,
          hasLien: false,
          legacyDocumentField: "preserved",
          status: "charged",
        },
        financing: {
          bankName: undefined,
          financedAmountCents: 3_000_000,
          legacyProviderCode: "provider-42",
          rank: "R3",
          status: "approved",
        },
        insurance: {
          appliedCommissionPercentage: 12.5,
          premiumCents: 120_000,
          status: "issued",
        },
        legacyTopLevel: { keep: true },
        source: "lead",
      },
    });

    const cleanSnapshot = cleanCreateSaleDraftInput(parsed).saleSourceSnapshot;
    expect(cleanSnapshot).toEqual(parsed.saleSourceSnapshot);
    expect(cleanSnapshot?.financing).not.toHaveProperty("bankName");
    expect(parsed.saleSourceSnapshot?.financing).toMatchObject({
      legacyProviderCode: "provider-42",
      rank: "R3",
    });
    expect(parsed.saleSourceSnapshot?.legacyTopLevel).toEqual({ keep: true });
  });

  it("rejects invalid ranks, insurance percentages, and documentation amounts", () => {
    expect(
      saleDraftSchema.safeParse({
        saleSourceSnapshot: {
          financing: { rank: "R6" },
        },
      }).success,
    ).toBe(false);
    expect(
      saleDraftSchema.safeParse({
        saleSourceSnapshot: {
          insurance: { appliedCommissionPercentage: 21 },
        },
      }).success,
    ).toBe(false);
    expect(
      saleDraftSchema.safeParse({
        saleSourceSnapshot: {
          documentation: { chargedAmountCents: -1 },
        },
      }).success,
    ).toBe(false);
  });
});

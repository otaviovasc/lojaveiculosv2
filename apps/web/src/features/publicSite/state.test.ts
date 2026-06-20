import { describe, expect, it } from "vitest";
import { publicStorefrontPreview } from "./fixtures";
import { deriveLeadCaptureState, derivePublicStorefrontState } from "./state";

describe("derivePublicStorefrontState", () => {
  it("keeps loading state while requests are pending", () => {
    expect(derivePublicStorefrontState({ isLoading: true })).toEqual({
      kind: "loading",
    });
  });

  it("returns error state when loading fails", () => {
    const error = new Error("network");

    expect(derivePublicStorefrontState({ error, isLoading: false })).toEqual({
      error,
      kind: "error",
    });
  });

  it("returns empty state when the store has no public listings", () => {
    const state = derivePublicStorefrontState({
      data: { ...publicStorefrontPreview, listings: [] },
      isLoading: false,
    });

    expect(state.kind).toBe("empty");
  });

  it("returns ready state when public listings are present", () => {
    const state = derivePublicStorefrontState({
      data: publicStorefrontPreview,
      isLoading: false,
    });

    expect(state.kind).toBe("ready");
  });
});

describe("deriveLeadCaptureState", () => {
  it("keeps submitting state while lead capture is pending", () => {
    expect(deriveLeadCaptureState({ isSubmitting: true })).toEqual({
      kind: "submitting",
    });
  });

  it("returns submitted state with lead id", () => {
    expect(
      deriveLeadCaptureState({
        isSubmitting: false,
        submittedLeadId: "lead_1",
      }),
    ).toEqual({ kind: "submitted", leadId: "lead_1" });
  });

  it("returns error state when lead capture fails", () => {
    const error = new Error("network");

    expect(deriveLeadCaptureState({ error, isSubmitting: false })).toEqual({
      error,
      kind: "error",
    });
  });
});

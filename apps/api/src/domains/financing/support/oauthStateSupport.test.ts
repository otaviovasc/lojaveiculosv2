import { describe, expect, it } from "vitest";
import {
  bindFinancingOAuthReturnTarget,
  readFinancingOAuthReturnTarget,
} from "./oauthStateSupport.js";

describe("financing OAuth return target", () => {
  it("binds direct-store flows to the simulations workspace", () => {
    const state = bindFinancingOAuthReturnTarget("opaque", "store");

    expect(state).toBe("lojav2.store.opaque");
    expect(readFinancingOAuthReturnTarget(state)).toBe("store");
  });

  it("keeps agency and legacy opaque states on the agency console", () => {
    expect(
      readFinancingOAuthReturnTarget(
        bindFinancingOAuthReturnTarget("opaque", "agency"),
      ),
    ).toBe("agency");
    expect(readFinancingOAuthReturnTarget("legacy-opaque-state")).toBe(
      "agency",
    );
  });

  it("does not accept a caller-selected URL", () => {
    expect(
      readFinancingOAuthReturnTarget("lojav2.https://evil.example.opaque"),
    ).toBe("agency");
  });
});

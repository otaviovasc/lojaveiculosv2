import { describe, expect, it } from "vitest";
import { getDashboardBodyState } from "./dashboardViewState";

describe("dashboard view state", () => {
  it("keeps the dashboard in loading state until analytics data is ready", () => {
    expect(getDashboardBodyState({ kind: "loading" }, null)).toBe("loading");
  });

  it("does not show the loading panel after an initial analytics failure", () => {
    expect(
      getDashboardBodyState(
        { kind: "error", message: "Analytics request failed with status 403" },
        null,
      ),
    ).toBe("none");
  });
});

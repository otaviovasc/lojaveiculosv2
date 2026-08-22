import { describe, expect, it } from "vitest";
import {
  crmConversationCycleHash,
  crmScopeHash,
  readCrmConversationCycleIdFromHash,
  readCrmRouteStateFromHash,
  readCrmScopeFromHash,
} from "./crmRouteState";

describe("CRM scope route state", () => {
  it("round-trips the statistics scope without changing the CRM surface", () => {
    const hash = crmScopeHash("statistics");
    expect(hash).toBe("/crm?surface=conversations&scope=statistics");
    expect(readCrmScopeFromHash(`#${hash}`)).toBe("statistics");
  });

  it("falls back for unknown scope values", () => {
    expect(readCrmScopeFromHash("#/crm?scope=unknown")).toBe("conversations");
  });

  it("round-trips the selected conversation and accepts the legacy key", () => {
    const hash = crmConversationCycleHash("cycle / 42");
    expect(readCrmConversationCycleIdFromHash(`#${hash}`)).toBe("cycle / 42");
    expect(
      readCrmConversationCycleIdFromHash("#/crm?crm_session=legacy-1"),
    ).toBe("legacy-1");
    expect(readCrmRouteStateFromHash(`#${hash}`)).toEqual({
      cycleId: "cycle / 42",
      scope: "conversations",
    });
  });

  it("does not carry a stale conversation into another CRM scope", () => {
    expect(
      readCrmRouteStateFromHash(
        "#/crm?surface=conversations&scope=statistics&cycleId=stale",
      ),
    ).toEqual({ cycleId: null, scope: "statistics" });
  });
});

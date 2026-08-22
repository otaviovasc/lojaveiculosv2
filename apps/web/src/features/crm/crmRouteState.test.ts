import { describe, expect, it } from "vitest";
import { crmScopeHash, readCrmScopeFromHash } from "./crmRouteState";

describe("CRM scope route state", () => {
  it("round-trips the statistics scope without changing the CRM surface", () => {
    const hash = crmScopeHash("statistics");
    expect(hash).toBe("/crm?surface=conversations&scope=statistics");
    expect(readCrmScopeFromHash(`#${hash}`)).toBe("statistics");
  });

  it("falls back for unknown scope values", () => {
    expect(readCrmScopeFromHash("#/crm?scope=unknown")).toBe("conversations");
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createAutoEntryRulesApi } from "./apiClient";
import type { AutoEntryRule, AutoEntryRuleInput } from "./types";

describe("auto-entry rules API", () => {
  it("loads the canonical rules collection with runtime headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        rules: [autoEntryRule()],
      }),
    );
    const api = createAutoEntryRulesApi({
      baseUrl: "http://api.test/api/v1/",
      fetch: fetchMock,
      getHeaders: async () => ({ Authorization: "Bearer test" }),
    });

    await expect(api.listRules()).resolves.toEqual([autoEntryRule()]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/finance/auto-entry-rules",
      expect.objectContaining({
        headers: { Authorization: "Bearer test" },
      }),
    );
  });

  it("uses POST, PATCH, and DELETE on the audited rule resources", async () => {
    const rule = autoEntryRule();
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => jsonResponse({ rule }));
    const api = createAutoEntryRulesApi({
      fetch: fetchMock,
      getHeaders: async () => ({ "Content-Type": "application/json" }),
    });
    const input = ruleInput(rule);

    await api.createRule(input);
    await api.updateRule("rule/with slash", input);
    await api.deleteRule("rule/with slash");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/finance/auto-entry-rules",
      expect.objectContaining({ body: JSON.stringify(input), method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/finance/auto-entry-rules/rule%2Fwith%20slash",
      expect.objectContaining({ body: JSON.stringify(input), method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/finance/auto-entry-rules/rule%2Fwith%20slash",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function ruleInput(rule: AutoEntryRule): AutoEntryRuleInput {
  return {
    calculation: rule.calculation,
    category: rule.category,
    event: rule.event,
    metadata: rule.metadata,
    name: rule.name,
    outputType: rule.outputType,
    priority: rule.priority,
    sellerUserId: rule.sellerUserId,
    status: rule.status,
    timing: rule.timing,
  };
}

function autoEntryRule(): AutoEntryRule {
  return {
    calculation: { amountCents: 50000, kind: "fixed" },
    category: "Comissão de venda",
    conditions: {},
    createdAt: "2026-07-13T12:00:00.000Z",
    event: "vehicle_sale_closed",
    family: null,
    id: "rule_1",
    metadata: {},
    name: "Comissão padrão",
    outputType: "commission",
    priority: 80,
    recipient: { kind: "event_seller" },
    resolution: "additive",
    ruleKey: null,
    sellerUserId: null,
    status: "active",
    timing: { kind: "same_day" },
    updatedAt: "2026-07-13T12:00:00.000Z",
  };
}

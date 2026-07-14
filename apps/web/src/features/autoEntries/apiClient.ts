import { readApiJson } from "../../lib/apiErrors";
import {
  createRuntimeAuthHeaders,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";
import type { AutoEntryRule, AutoEntryRuleInput } from "./types";

export type AutoEntryRulesApi = {
  createRule: (input: AutoEntryRuleInput) => Promise<AutoEntryRule>;
  deleteRule: (ruleId: string) => Promise<AutoEntryRule>;
  listRules: () => Promise<AutoEntryRule[]>;
  updateRule: (
    ruleId: string,
    input: AutoEntryRuleInput,
  ) => Promise<AutoEntryRule>;
};

export function createAutoEntryRulesApi({
  baseUrl,
  fetch: fetchImplementation,
  getHeaders = defaultHeaders,
}: {
  baseUrl?: string;
  fetch: typeof fetch;
  getHeaders?: () => Promise<HeadersInit>;
}): AutoEntryRulesApi {
  const collection = endpoint("/finance/auto-entry-rules", baseUrl);
  const request = async <T>(url: string, init: RequestInit = {}) => {
    const response = await fetchImplementation(url, {
      ...init,
      headers: await getHeaders(),
    });
    return readApiJson<T>(response, {
      endpoint: url,
      feature: "Lançamentos automáticos",
    });
  };
  const mutate = async (
    url: string,
    method: "PATCH" | "POST",
    input: AutoEntryRuleInput,
  ) => {
    const payload = await request<{ rule: AutoEntryRule } | AutoEntryRule>(
      url,
      { body: JSON.stringify(input), method },
    );
    return normalizeRule(unwrapRule(payload));
  };

  return {
    createRule: (input) => mutate(collection, "POST", input),
    deleteRule: async (ruleId) => {
      const payload = await request<{ rule: AutoEntryRule } | AutoEntryRule>(
        ruleEndpoint(collection, ruleId),
        { method: "DELETE" },
      );
      return normalizeRule(unwrapRule(payload));
    },
    listRules: async () => {
      const payload = await request<{ rules: AutoEntryRule[] }>(collection);
      return payload.rules.map(normalizeRule);
    },
    updateRule: (ruleId, input) =>
      mutate(ruleEndpoint(collection, ruleId), "PATCH", input),
  };
}

export function createRuntimeAutoEntryRulesApi(): AutoEntryRulesApi {
  return createAutoEntryRulesApi({
    ...readRuntimeApiBaseUrl(),
    fetch: window.fetch.bind(window),
  });
}

async function defaultHeaders() {
  return createRuntimeAuthHeaders({ contentType: "json" });
}

function endpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function ruleEndpoint(collection: string, ruleId: string) {
  return `${collection}/${encodeURIComponent(ruleId)}`;
}

function unwrapRule(payload: { rule: AutoEntryRule } | AutoEntryRule) {
  return "rule" in payload ? payload.rule : payload;
}

function normalizeRule(rule: AutoEntryRule): AutoEntryRule {
  return {
    ...rule,
    conditions: rule.conditions ?? {},
    family: rule.family ?? null,
    recipient: rule.recipient ?? { kind: "event_seller" },
    resolution: rule.resolution ?? "additive",
    ruleKey: rule.ruleKey ?? null,
  };
}

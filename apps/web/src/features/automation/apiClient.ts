import {
  createRuntimeAuthHeaders,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";
import { readApiJson } from "../../lib/apiErrors";
import type {
  AutomationDecisionInput,
  AutomationRun,
  AutomationRunList,
  CreateAutomationRunInput,
} from "./types";

export type AutomationApi = {
  approveStep: (input: AutomationDecisionInput) => Promise<AutomationRun>;
  cancelRun: (
    runId: string,
    expectedRunVersion: number,
  ) => Promise<AutomationRun>;
  createRun: (input: CreateAutomationRunInput) => Promise<AutomationRun>;
  getRun: (runId: string) => Promise<AutomationRun>;
  listRuns: (input?: {
    limit?: number;
    offset?: number;
  }) => Promise<AutomationRunList>;
  rejectStep: (input: AutomationDecisionInput) => Promise<AutomationRun>;
};

export function createAutomationApi({
  baseUrl,
  fetch: fetchImplementation,
}: {
  baseUrl?: string;
  fetch: typeof fetch;
}): AutomationApi {
  const request = async <T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> => {
    const hasBody = init.body !== undefined;
    const response = await fetchImplementation(endpoint(path, baseUrl), {
      ...init,
      headers: await createRuntimeAuthHeaders({
        contentType: hasBody ? "json" : "none",
      }),
    });
    return readApiJson<T>(response, {
      endpoint: path,
      feature: "Automações",
    });
  };

  const decide = async (
    decision: "approve" | "reject",
    input: AutomationDecisionInput,
  ) => {
    const { runId, stepId, ...body } = input;
    const payload = await request<{ data: AutomationRun }>(
      `/automation/runs/${encodeURIComponent(runId)}/steps/${encodeURIComponent(stepId)}/${decision}`,
      { body: JSON.stringify(body), method: "POST" },
    );
    return payload.data;
  };

  return {
    approveStep: (input) => decide("approve", input),
    cancelRun: async (runId, expectedRunVersion) => {
      const payload = await request<{ data: AutomationRun }>(
        `/automation/runs/${encodeURIComponent(runId)}/cancel`,
        {
          body: JSON.stringify({ expectedRunVersion }),
          method: "POST",
        },
      );
      return payload.data;
    },
    createRun: async (input) => {
      const payload = await request<{ data: AutomationRun }>(
        "/automation/runs",
        { body: JSON.stringify(input), method: "POST" },
      );
      return payload.data;
    },
    getRun: async (runId) => {
      const payload = await request<{ data: AutomationRun }>(
        `/automation/runs/${encodeURIComponent(runId)}`,
      );
      return payload.data;
    },
    listRuns: ({ limit = 40, offset = 0 } = {}) =>
      request<AutomationRunList>(
        `/automation/runs?limit=${limit}&offset=${offset}`,
      ),
    rejectStep: (input) => decide("reject", input),
  };
}

export function createRuntimeAutomationApi(): AutomationApi {
  return createAutomationApi({
    ...readRuntimeApiBaseUrl(),
    fetch: window.fetch.bind(window),
  });
}

function endpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

import { readApiJson } from "../../lib/apiErrors";
import { createCrmEndpoint } from "./apiClient";
import { createProductCrmHeaders } from "./productCrmApi";
import type { ProductCrmAuth } from "./productCrmTypes";

export type LeadVisitStatus =
  "scheduled" | "confirmed" | "completed" | "no_show" | "cancelled";

export type CrmLeadVisit = {
  assignedUserId: string | null;
  createdAt: string;
  id: string;
  leadId: string;
  notes: string | null;
  scheduledAt: string;
  status: LeadVisitStatus;
  storeId: string;
  tenantId: string;
  updatedAt: string;
};

export type ListCrmVisitsInput = {
  from?: string;
  leadId?: string;
  limit?: number;
  offset?: number;
  sessionId?: string;
  status?: LeadVisitStatus;
  to?: string;
};

export type CreateCrmVisitInput = {
  assignedUserId?: string | null;
  leadId: string;
  notes?: string | null;
  scheduledAt: string;
  sessionId?: string;
};

export type UpdateCrmVisitInput = {
  assignedUserId?: string | null;
  notes?: string | null;
  scheduledAt?: string;
  status?: Extract<LeadVisitStatus, "confirmed" | "no_show" | "scheduled">;
};

export type CrmVisitsApi = {
  cancelVisit: (visitId: string) => Promise<CrmLeadVisit>;
  completeVisit: (visitId: string) => Promise<CrmLeadVisit>;
  createVisit: (input: CreateCrmVisitInput) => Promise<CrmLeadVisit>;
  listVisits: (input?: ListCrmVisitsInput) => Promise<CrmLeadVisit[]>;
  updateVisit: (
    visitId: string,
    input: UpdateCrmVisitInput,
  ) => Promise<CrmLeadVisit>;
};

export function createCrmVisitsApi({
  auth = {},
  baseUrl,
  fetch,
}: {
  auth?: ProductCrmAuth;
  baseUrl?: string;
  fetch: typeof globalThis.fetch;
}): CrmVisitsApi {
  const getJson = <T>(route: string) =>
    fetch(route, {
      headers: createProductCrmHeaders(auth),
      method: "GET",
    }).then((response) => readApiJson<T>(response, { feature: "CRM visits" }));
  const postJson = <T>(route: string, body: object = {}) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createProductCrmHeaders(auth),
      method: "POST",
    }).then((response) => readApiJson<T>(response, { feature: "CRM visits" }));
  const patchJson = <T>(route: string, body: object = {}) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createProductCrmHeaders(auth),
      method: "PATCH",
    }).then((response) => readApiJson<T>(response, { feature: "CRM visits" }));

  return {
    cancelVisit: (visitId) => postJson(visitCancelRoute(visitId, baseUrl)),
    completeVisit: (visitId) => postJson(visitCompleteRoute(visitId, baseUrl)),
    createVisit: (input) => postJson(visitsRoute(baseUrl), input),
    listVisits: (input = {}) =>
      getJson<{ visits: CrmLeadVisit[] }>(
        withQuery(visitsRoute(baseUrl), createVisitsQuery(input)),
      ).then((response) => response.visits),
    updateVisit: (visitId, input) =>
      patchJson(visitRoute(visitId, baseUrl), input),
  };
}

function visitsRoute(baseUrl?: string) {
  return createCrmEndpoint("/crm/visits", baseUrl);
}

function visitRoute(visitId: string, baseUrl?: string) {
  return createCrmEndpoint(
    `/crm/visits/${encodeURIComponent(visitId)}`,
    baseUrl,
  );
}

function visitCancelRoute(visitId: string, baseUrl?: string) {
  return createCrmEndpoint(
    `/crm/visits/${encodeURIComponent(visitId)}/cancel`,
    baseUrl,
  );
}

function visitCompleteRoute(visitId: string, baseUrl?: string) {
  return createCrmEndpoint(
    `/crm/visits/${encodeURIComponent(visitId)}/complete`,
    baseUrl,
  );
}

function createVisitsQuery(input: ListCrmVisitsInput) {
  const params = new URLSearchParams();
  addOptionalParam(params, "from", input.from);
  addOptionalParam(params, "leadId", input.leadId);
  addOptionalParam(params, "limit", input.limit);
  addOptionalParam(params, "offset", input.offset);
  addOptionalParam(params, "sessionId", input.sessionId);
  addOptionalParam(params, "status", input.status);
  addOptionalParam(params, "to", input.to);
  return params;
}

function addOptionalParam(
  params: URLSearchParams,
  key: string,
  value: boolean | number | string | null | undefined,
) {
  if (value !== undefined && value !== null && value !== "") {
    params.set(key, String(value));
  }
}

function withQuery(route: string, query: URLSearchParams) {
  const serialized = query.toString();
  return serialized ? `${route}?${serialized}` : route;
}

function cleanJson(body: object) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}

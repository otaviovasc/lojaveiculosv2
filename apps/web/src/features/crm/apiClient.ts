import type { CrmAuthState, CrmRequestHeaders } from "./types";

export function createCrmRequestHeaders(auth: CrmAuthState): CrmRequestHeaders {
  const headers: CrmRequestHeaders = {};

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  if (auth.agent?.id) {
    headers["x-crm-agent-id"] = auth.agent.id;
  }

  return headers;
}

export function describeCrmHeaderContract(auth: CrmAuthState) {
  const headers = createCrmRequestHeaders(auth);

  return [
    {
      key: "Authorization",
      state: headers.Authorization ? "ready" : "waiting",
      value: headers.Authorization ? "Bearer <token>" : "missing token",
    },
    {
      key: "x-crm-agent-id",
      state: headers["x-crm-agent-id"] ? "ready" : "waiting",
      value: headers["x-crm-agent-id"] ?? "missing agent",
    },
  ] as const;
}

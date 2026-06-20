import type { ComplianceAuth, ComplianceSnapshot } from "./types";

export type ComplianceApi = {
  getSnapshot: () => Promise<ComplianceSnapshot>;
};

export type CreateComplianceApiOptions = {
  auth?: ComplianceAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createComplianceApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateComplianceApiOptions): ComplianceApi {
  return {
    getSnapshot: () =>
      fetch(createEndpoint("/compliance/snapshot", baseUrl), {
        headers: createHeaders(auth),
      }).then(readJson<ComplianceSnapshot>),
  };
}

function createHeaders(auth: ComplianceAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

function createEndpoint(path: string, baseUrl = "/api/v1") {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Compliance request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

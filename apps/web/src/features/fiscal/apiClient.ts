import { readApiJson } from "../../lib/apiErrors";
import type {
  FiscalAuth,
  FiscalDocument,
  FiscalOverview,
  IssueFiscalDocumentInput,
} from "./types";

export type FiscalApi = {
  getOverview: () => Promise<FiscalOverview>;
  issueDocument: (input: IssueFiscalDocumentInput) => Promise<FiscalDocument>;
};

export type CreateFiscalApiOptions = {
  auth?: FiscalAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createFiscalApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateFiscalApiOptions): FiscalApi {
  return {
    getOverview: () =>
      fetch(createEndpoint("/fiscal/overview", baseUrl), {
        headers: createHeaders(auth),
      }).then(readJson<FiscalOverview>),
    issueDocument: (input) =>
      fetch(createEndpoint("/fiscal/documents", baseUrl), {
        body: JSON.stringify(input),
        headers: createHeaders(auth),
        method: "POST",
      }).then(readJson<FiscalDocument>),
  };
}

function createHeaders(auth: FiscalAuth): HeadersInit {
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
  return readApiJson<T>(response, { feature: "Fiscal" });
}

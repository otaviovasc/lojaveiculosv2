import { readApiJson } from "../../lib/apiErrors";
import type {
  FiscalAuth,
  FiscalDocument,
  FiscalOverview,
  FiscalRecipient,
  FiscalTemplate,
  IssueFiscalDocumentInput,
  PreviewTemplateResult,
} from "./types";

export type FiscalApi = {
  archiveRecipient: (recipientId: string) => Promise<FiscalRecipient>;
  archiveTemplate: (templateId: string) => Promise<FiscalTemplate>;
  cancelDocument: (
    documentId: string,
    input: { providerDocumentId: string; reason: string },
  ) => Promise<FiscalDocument>;
  createRecipient: (
    input: Partial<FiscalRecipient>,
  ) => Promise<FiscalRecipient>;
  createTemplate: (input: Partial<FiscalTemplate>) => Promise<FiscalTemplate>;
  getOverview: () => Promise<FiscalOverview>;
  issueDocument: (input: IssueFiscalDocumentInput) => Promise<FiscalDocument>;
  listRecipients: () => Promise<FiscalRecipient[]>;
  listTemplates: (recipientId?: string | null) => Promise<FiscalTemplate[]>;
  previewTemplate: (input: {
    templateId: string;
    variables: Record<string, unknown>;
  }) => Promise<PreviewTemplateResult>;
  repeatDocument: (documentId: string) => Promise<FiscalDocument>;
  syncDocumentStatus: (
    documentId: string,
    input: { providerDocumentId: string },
  ) => Promise<FiscalDocument>;
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
    archiveRecipient: (recipientId) =>
      request("DELETE", `/fiscal/recipients/${recipientId}`, undefined),
    archiveTemplate: (templateId) =>
      request("DELETE", `/fiscal/templates/${templateId}`, undefined),
    cancelDocument: (documentId, input) =>
      request("POST", `/fiscal/documents/${documentId}/cancel`, input),
    createRecipient: (input) => request("POST", "/fiscal/recipients", input),
    createTemplate: (input) => request("POST", "/fiscal/templates", input),
    getOverview: () =>
      fetch(createEndpoint("/fiscal/overview", baseUrl), {
        headers: createHeaders(auth),
      }).then(readJson<FiscalOverview>),
    issueDocument: (input) => request("POST", "/fiscal/documents", input),
    listRecipients: () => request("GET", "/fiscal/recipients", undefined),
    listTemplates: (recipientId) =>
      request(
        "GET",
        `/fiscal/templates${
          recipientId ? `?recipientId=${encodeURIComponent(recipientId)}` : ""
        }`,
        undefined,
      ),
    previewTemplate: (input) =>
      request("POST", "/fiscal/templates/preview", input),
    repeatDocument: (documentId) =>
      request("POST", `/fiscal/documents/${documentId}/repeat`, undefined),
    syncDocumentStatus: (documentId, input) =>
      request("POST", `/fiscal/documents/${documentId}/status-sync`, input),
  };

  function request<T>(method: string, path: string, body: unknown): Promise<T> {
    return fetch(createEndpoint(path, baseUrl), {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: createHeaders(auth),
      method,
    }).then(readJson<T>);
  }
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

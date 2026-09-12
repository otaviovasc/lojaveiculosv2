import { readApiJson } from "../../lib/apiErrors";
import type {
  ConfirmFiscalDefaultsInput,
  FiscalAuth,
  FiscalConnection,
  FiscalArtifactFormat,
  FiscalDocumentArtifact,
  FiscalDocument,
  FiscalOverview,
  FiscalRecipient,
  FiscalTemplate,
  IssueFiscalDocumentInput,
  PreviewTemplateResult,
  SetupFiscalConnectionInput,
  UploadFiscalCertificateInput,
} from "./types";

export type FiscalApi = {
  archiveRecipient: (recipientId: string) => Promise<FiscalRecipient>;
  archiveTemplate: (templateId: string) => Promise<FiscalTemplate>;
  cancelDocument: (
    documentId: string,
    input: { reason: string },
  ) => Promise<FiscalDocument>;
  confirmDefaults: (
    input: ConfirmFiscalDefaultsInput,
  ) => Promise<FiscalConnection>;
  createRecipient: (
    input: Partial<FiscalRecipient>,
  ) => Promise<FiscalRecipient>;
  createTemplate: (input: Partial<FiscalTemplate>) => Promise<FiscalTemplate>;
  downloadDocumentArtifact: (
    documentId: string,
    format: FiscalArtifactFormat,
  ) => Promise<FiscalDocumentArtifact>;
  getConnection: () => Promise<FiscalConnection>;
  getOverview: () => Promise<FiscalOverview>;
  issueDocument: (input: IssueFiscalDocumentInput) => Promise<FiscalDocument>;
  listRecipients: () => Promise<FiscalRecipient[]>;
  listTemplates: (recipientId?: string | null) => Promise<FiscalTemplate[]>;
  previewTemplate: (input: {
    templateId: string;
    variables: Record<string, unknown>;
  }) => Promise<PreviewTemplateResult>;
  repeatDocument: (documentId: string) => Promise<FiscalDocument>;
  setupConnection: (
    input: SetupFiscalConnectionInput,
  ) => Promise<FiscalConnection>;
  syncConnection: () => Promise<FiscalConnection>;
  syncDocumentStatus: (
    documentId: string,
    input: Record<string, never>,
  ) => Promise<FiscalDocument>;
  uploadCertificate: (
    input: UploadFiscalCertificateInput,
  ) => Promise<FiscalConnection>;
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
    confirmDefaults: (input) =>
      request("POST", "/fiscal/connection/defaults/confirm", input),
    createRecipient: (input) => request("POST", "/fiscal/recipients", input),
    createTemplate: (input) => request("POST", "/fiscal/templates", input),
    downloadDocumentArtifact: (documentId, format) =>
      fetch(
        createEndpoint(
          `/fiscal/documents/${encodeURIComponent(documentId)}/artifacts/${format}`,
          baseUrl,
        ),
        { headers: createHeaders(auth, { json: false }) },
      ).then((response) => readArtifact(response, format)),
    getConnection: () => request("GET", "/fiscal/connection", undefined),
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
    setupConnection: (input) =>
      request("POST", "/fiscal/connection/setup", input),
    syncConnection: () => request("POST", "/fiscal/connection/sync", {}),
    syncDocumentStatus: (documentId, input) =>
      request("POST", `/fiscal/documents/${documentId}/status-sync`, input),
    uploadCertificate: (input) =>
      fetch(createEndpoint("/fiscal/connection/certificate", baseUrl), {
        body: createCertificateForm(input),
        headers: createHeaders(auth, { json: false }),
        method: "POST",
      }).then(readJson<FiscalConnection>),
  };

  function request<T>(method: string, path: string, body: unknown): Promise<T> {
    return fetch(createEndpoint(path, baseUrl), {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: createHeaders(auth),
      method,
    }).then(readJson<T>);
  }
}

function createCertificateForm(input: UploadFiscalCertificateInput): FormData {
  const form = new FormData();
  form.set("certificate", input.certificate);
  form.set("password", input.password);
  return form;
}

function createHeaders(
  auth: FiscalAuth,
  options: { json?: boolean } = {},
): HeadersInit {
  const headers: Record<string, string> = {};
  if (options.json !== false) headers["Content-Type"] = "application/json";
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

async function readArtifact(
  response: Response,
  format: FiscalArtifactFormat,
): Promise<FiscalDocumentArtifact> {
  if (!response.ok) {
    await readApiJson<never>(response, { feature: "Fiscal" });
    throw new Error("Fiscal artifact request failed without an API error.");
  }
  const contentType = format === "pdf" ? "application/pdf" : "application/xml";
  const responseType = (response.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  const blob = await response.blob();
  if (blob.size === 0 || responseType !== contentType) {
    throw new Error(
      "O servidor não retornou um arquivo fiscal oficial válido.",
    );
  }
  return {
    blob,
    contentType,
    fileName: readDownloadFileName(response, format),
  };
}

function readDownloadFileName(
  response: Response,
  format: FiscalArtifactFormat,
) {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const safeName = match?.[1]?.replace(/[^a-zA-Z0-9._-]/g, "");
  return safeName || `documento-fiscal-oficial.${format}`;
}

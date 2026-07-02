import {
  createFiscalApi,
  type CreateFiscalApiOptions,
  type FiscalApi,
} from "./apiClient";
import type { FiscalAuth } from "./types";
import {
  createRuntimeActorAuth,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export async function createFiscalApiOptions(): Promise<CreateFiscalApiOptions> {
  const accessToken = await readClerkToken();
  return {
    auth: createAuthFromEnv(accessToken),
    fetch: window.fetch.bind(window),
    ...readBaseUrl(),
  };
}

export function createRuntimeFiscalApi(): FiscalApi {
  const api = async () => createFiscalApi(await createFiscalApiOptions());
  return {
    archiveRecipient: async (recipientId) =>
      (await api()).archiveRecipient(recipientId),
    archiveTemplate: async (templateId) =>
      (await api()).archiveTemplate(templateId),
    cancelDocument: async (documentId, input) =>
      (await api()).cancelDocument(documentId, input),
    createRecipient: async (input) => (await api()).createRecipient(input),
    createTemplate: async (input) => (await api()).createTemplate(input),
    getOverview: async () => (await api()).getOverview(),
    issueDocument: async (input) => (await api()).issueDocument(input),
    listRecipients: async () => (await api()).listRecipients(),
    listTemplates: async (recipientId) =>
      (await api()).listTemplates(recipientId),
    previewTemplate: async (input) => (await api()).previewTemplate(input),
    repeatDocument: async (documentId) =>
      (await api()).repeatDocument(documentId),
    syncDocumentStatus: async (documentId, input) =>
      (await api()).syncDocumentStatus(documentId, input),
  };
}

function createAuthFromEnv(accessToken?: string | null): FiscalAuth {
  return createRuntimeActorAuth(accessToken);
}

function readBaseUrl(): Pick<CreateFiscalApiOptions, "baseUrl"> {
  return readRuntimeApiBaseUrl();
}

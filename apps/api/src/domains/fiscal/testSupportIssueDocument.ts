import { vi } from "vitest";
import { createServiceContext } from "../../shared/serviceContext.js";
import type { FiscalProviderGateway } from "./ports/fiscalProviderGateway.js";
import type {
  FiscalDocument,
  FiscalRepository,
} from "./ports/fiscalRepository.js";
import type { FiscalServicePorts } from "./services/FiscalService/serviceSupport.js";
import { createFiscalTestAuxiliaryPorts } from "./testSupport.js";

export function createIssueContext(
  record: ReturnType<typeof createIssueHarness>["record"],
  overrides: { permissions?: string[] } = {},
) {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: { record },
      permissions: overrides.permissions ?? [
        "fiscal.document.issue",
        "fiscal.manage",
      ],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["fiscal"] },
  );
}

export function createIssueHarness(status: "failed" | "issued" = "issued") {
  const record = vi.fn(async () => undefined);
  const issueDocument = vi.fn<FiscalProviderGateway["issueDocument"]>(
    async () => ({
      accessKey: "access_key_1",
      providerDocumentId: "provider_document_1",
      status,
    }),
  );
  const createDocument = vi.fn<FiscalRepository["createDocument"]>(
    async (input) => createDocumentRecord(input),
  );
  const updateDocumentStatus = vi.fn<FiscalRepository["updateDocumentStatus"]>(
    async (input) => ({
      ...createDocumentRecord({
        documentType: "nfe",
        status: input.status,
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
      accessKey: input.accessKey ?? null,
      metadata: input.metadata ?? {},
      providerDocumentId: input.providerDocumentId ?? null,
    }),
  );
  const ports: FiscalServicePorts = {
    ...createFiscalTestAuxiliaryPorts(),
    fiscalProviderGateway: {
      cancelDocument: unused("cancelDocument"),
      getProviderStatus: async () => ({
        configured: true,
        missingConfiguration: [],
        provider: "spedy",
        webhookConfigured: true,
      }),
      issueDocument,
      syncDocumentStatus: unused("syncDocumentStatus"),
    },
    fiscalRepository: {
      createDocument,
      createDocumentSnapshot: async () => undefined,
      createRecipient: unused("createRecipient"),
      createTemplate: unused("createTemplate"),
      findDocumentById: unused("findDocumentById"),
      getDocument: unused("getDocument"),
      getOverview: unused("getOverview"),
      getRecipient: unused("getRecipient"),
      getTemplate: unused("getTemplate"),
      listRecipients: unused("listRecipients"),
      listTemplates: unused("listTemplates"),
      updateDocumentStatus,
      upsertProviderDocument: unused("upsertProviderDocument"),
      updateRecipient: unused("updateRecipient"),
      updateTemplate: unused("updateTemplate"),
    },
  };
  return {
    createDocument,
    issueDocument,
    ports,
    record,
    updateDocumentStatus,
  };
}

function createDocumentRecord(
  input: Parameters<FiscalRepository["createDocument"]>[0],
): FiscalDocument {
  return {
    accessKey: input.accessKey ?? null,
    createdAt: new Date("2026-07-12T12:00:00.000Z"),
    documentKind: input.documentKind ?? "nfe",
    documentType: input.documentType,
    id: "fiscal_document_1",
    issuedAt:
      input.status === "issued" ? new Date("2026-07-12T12:00:00.000Z") : null,
    metadata: input.metadata ?? {},
    provider: "spedy",
    providerDocumentId: input.providerDocumentId ?? null,
    recipientId: input.recipientId ?? null,
    status: input.status,
    storeId: input.storeId,
    templateId: input.templateId ?? null,
    templateVersion: input.templateVersion ?? null,
    tenantId: input.tenantId,
  };
}

function unused<Name extends string>(name: Name): never {
  return (async () => {
    throw new Error(`Unexpected ${name} call.`);
  }) as never;
}

import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { FiscalProviderGateway } from "../../ports/fiscalProviderGateway.js";
import type {
  FiscalDocument,
  FiscalRepository,
} from "../../ports/fiscalRepository.js";
import { issueFiscalDocument } from "./issueFiscalDocument.js";
import type { FiscalServicePorts } from "./serviceSupport.js";

describe("issueFiscalDocument", () => {
  it("issues inside the persisted scope and records a critical audit", async () => {
    const harness = createHarness();
    const context = createContext(harness.record);

    const result = await issueFiscalDocument(
      context,
      {
        documentType: "nfe",
        externalReference: "sale_1",
        metadata: { saleId: "sale_1" },
      },
      harness.ports,
    );

    expect(harness.issueDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentKind: "nfe",
        documentType: "nfe",
        externalReference: "sale_1",
        metadata: { saleId: "sale_1" },
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
    expect(harness.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          externalReference: "sale_1",
          saleId: "sale_1",
        }),
        status: "queued",
      }),
    );
    expect(harness.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "fiscal.document.issue",
        criticality: "critical",
        outcome: "succeeded",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
    expect(result.status).toBe("issued");
  });

  it("uses empty metadata and audits a provider failure as failed", async () => {
    const harness = createHarness("failed");

    await issueFiscalDocument(
      createContext(harness.record),
      { documentType: "nfe", externalReference: "sale_2" },
      harness.ports,
    );

    expect(harness.issueDocument).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: {} }),
    );
    expect(harness.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ externalReference: "sale_2" }),
      }),
    );
    expect(harness.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed" }),
    );
  });

  it("denies missing permission before provider or repository access", async () => {
    const harness = createHarness();

    await expect(
      issueFiscalDocument(
        createContext(harness.record, { permissions: [] }),
        { documentType: "nfe", externalReference: "sale_1" },
        harness.ports,
      ),
    ).rejects.toThrow("Missing permission: fiscal.manage");

    expect(harness.issueDocument).not.toHaveBeenCalled();
    expect(harness.createDocument).not.toHaveBeenCalled();
  });

  it("fails closed when the critical audit cannot be persisted", async () => {
    const harness = createHarness();
    harness.record.mockRejectedValueOnce(new Error("audit unavailable"));

    await expect(
      issueFiscalDocument(
        createContext(harness.record),
        { documentType: "nfe", externalReference: "sale_1" },
        harness.ports,
      ),
    ).rejects.toThrow("audit unavailable");
  });
});

function createContext(
  record: ReturnType<typeof createHarness>["record"],
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
    { entitlements: ["nfe"] },
  );
}

function createHarness(status: "failed" | "issued" = "issued") {
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
    fiscalProviderGateway: {
      cancelDocument: unused("cancelDocument"),
      getProviderStatus: unused("getProviderStatus"),
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
      updateRecipient: unused("updateRecipient"),
      updateTemplate: unused("updateTemplate"),
    },
  };
  return { createDocument, issueDocument, ports, record };
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
